const Incident = require('../models/Incident');
const { autoAssignTeam, releaseTeam } = require('../services/assignmentService');
const { emitNewIncident, emitIncidentUpdated, emitSOSAlert } = require('../services/socketService');
const { notifyCitizenCompleted, sendSOSAlert } = require('../services/notificationService');
const { reverseGeocode } = require('../services/geocodingService');
const { scheduleRetry, addToAssignQueue } = require('../jobs/autoAssignJob');
const logger = require('../utils/logger');

const ACTIVE_RESCUE_STATUSES = ['ASSIGNED', 'ARRIVED', 'PROCESSING'];
const RESCUE_STATUS_TRANSITIONS = {
  ASSIGNED: ['ARRIVED'],
  ARRIVED: ['PROCESSING'],
  PROCESSING: ['COMPLETED'],
};

/**
 * @desc    Tạo sự cố mới
 * @route   POST /api/v1/incidents
 * @access  Private (Citizen, Dispatcher)
 */
exports.createIncident = async (req, res) => {
  const { type, severity, coordinates, address, description, callerPhone } = req.body;

  const parsedCoords = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
  const resolvedAddress = address || (await reverseGeocode(parsedCoords[1], parsedCoords[0]));

  const code = `INC-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
  const isDispatcher = req.user.role === 'DISPATCHER';
  const photos = req.files?.map((f) => `/uploads/${f.filename}`) || [];

  const incident = await Incident.create({
    code,
    type,
    severity,
    location: { type: 'Point', coordinates: parsedCoords, address: resolvedAddress },
    description,
    photos,
    reportedBy: isDispatcher ? null : req.user._id,
    callerPhone: isDispatcher ? callerPhone : undefined,
    timeline: [{
      status: 'PENDING',
      updatedBy: req.user._id,
      note: isDispatcher
        ? `Dispatcher ${req.user.name} tiếp nhận qua hotline — SĐT: ${callerPhone}`
        : 'Hệ thống tiếp nhận sự cố mới',
    }],
  });

  const io = req.app.get('io');
  if (io) emitNewIncident(io, incident);

  const assignedTeam = await autoAssignTeam(incident, io);
  if (!assignedTeam) await scheduleRetry(incident._id.toString());

  const updated = await Incident.findById(incident._id)
    .populate('reportedBy', 'name phone')
    .populate('assignedTeam', 'name code type');

  res.status(201).json({ success: true, data: updated });
};

/**
 * @desc    Danh sách sự cố (Dispatcher / Admin)
 * @route   GET /api/v1/incidents
 * @access  Private (Dispatcher, Admin)
 */
exports.getAllIncidents = async (req, res) => {
  const { status, type, severity, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (severity) filter.severity = severity;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [incidents, total] = await Promise.all([
    Incident.find(filter)
      .populate('reportedBy', 'name phone')
      .populate('assignedTeam', 'name code status type')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Incident.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: incidents.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: incidents,
  });
};

/**
 * @desc    Chi tiết một sự cố
 * @route   GET /api/v1/incidents/:id
 * @access  Private
 */
exports.getIncidentById = async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate('reportedBy', 'name phone')
    .populate('assignedTeam', 'name code type status currentLocation')
    .populate('timeline.updatedBy', 'name role');

  if (!incident) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố' });
  }

  if (req.user.role === 'RESCUE') {
    const userTeamId = req.user.rescueTeam?._id?.toString();
    if (!userTeamId || userTeamId !== incident.assignedTeam?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem sự cố này' });
    }
  }

  if (req.user.role === 'CITIZEN') {
    if (incident.reportedBy?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem sự cố này' });
    }
  }

  res.status(200).json({ success: true, data: incident });
};

/**
 * @desc    Theo dõi bằng mã tracking (Public)
 * @route   GET /api/v1/incidents/track/:code
 * @access  Public
 */
exports.trackIncidentByCode = async (req, res) => {
  const incident = await Incident.findOne({ code: req.params.code.toUpperCase() })
    .populate('assignedTeam', 'name code type')
    .select('-reportedBy -callerPhone -photos');

  if (!incident) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố với mã này' });
  }

  res.status(200).json({
    success: true,
    data: {
      code: incident.code,
      type: incident.type,
      status: incident.status,
      severity: incident.severity,
      location: { address: incident.location.address },
      description: incident.description,
      assignedTeam: incident.assignedTeam,
      estimatedArrival: incident.estimatedArrival,
      completedAt: incident.completedAt,
      timeline: incident.timeline,
      createdAt: incident.createdAt,
    },
  });
};

/**
 * @desc    Sự cố của Citizen đang đăng nhập
 * @route   GET /api/v1/incidents/my
 * @access  Private (Citizen)
 */
exports.getMyIncidents = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [incidents, total] = await Promise.all([
    Incident.find({ reportedBy: req.user._id })
      .populate('assignedTeam', 'name code type')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Incident.countDocuments({ reportedBy: req.user._id }),
  ]);

  res.status(200).json({
    success: true,
    count: incidents.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: incidents,
  });
};

/**
 * @desc    Sự cố đang xử lý của Rescue team
 * @route   GET /api/v1/incidents/rescue/active
 * @access  Private (Rescue)
 */
exports.getActiveRescueIncident = async (req, res) => {
  const teamId = req.user.rescueTeam?._id;
  if (!teamId) {
    return res.status(403).json({ success: false, message: 'Bạn chưa được gắn với đội cứu hộ nào' });
  }

  const incident = await Incident.findOne({
    assignedTeam: teamId,
    status: { $in: ACTIVE_RESCUE_STATUSES },
  })
    .populate('reportedBy', 'name phone')
    .populate('timeline.updatedBy', 'name role');

  res.status(200).json({ success: true, data: incident || null });
};

/**
 * @desc    Cập nhật trạng thái sự cố
 * @route   PATCH /api/v1/incidents/:id/status
 * @access  Private (Rescue, Dispatcher, Admin)
 */
exports.updateIncidentStatus = async (req, res) => {
  const { status, note, estimatedArrivalMinutes } = req.body;

  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố' });
  }

  if (req.user.role === 'RESCUE') {
    const userTeamId = req.user.rescueTeam?._id?.toString();
    if (!userTeamId || userTeamId !== incident.assignedTeam?.toString()) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật sự cố này' });
    }

    const allowedTransitions = RESCUE_STATUS_TRANSITIONS[incident.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Rescue chỉ có thể chuyển từ ${incident.status} sang ${allowedTransitions.join(', ') || 'không có trạng thái nào'}`,
      });
    }
  }

  incident.status = status;
  incident.timeline.push({
    status,
    updatedBy: req.user._id,
    note: note || `Cập nhật trạng thái thành ${status}`,
  });

  if (estimatedArrivalMinutes && status === 'ARRIVED') {
    incident.estimatedArrival = new Date(Date.now() + estimatedArrivalMinutes * 60000);
  }

  if (['COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL'].includes(status)) {
    incident.completedAt = new Date();
    const releasedTeam = await releaseTeam(incident);
    if (releasedTeam) {
      req.releasedTeam = releasedTeam;
    }
    if (status === 'COMPLETED' && incident.reportedBy) {
      await notifyCitizenCompleted(incident);
    }
  }

  await incident.save();

  const io = req.app.get('io');
  if (io) {
    emitIncidentUpdated(io, incident._id, {
      status,
      code: incident.code,
      estimatedArrival: incident.estimatedArrival,
    });
    if (req.releasedTeam) {
      io.to('dispatchers').emit('rescue:status-changed', { teamId: req.releasedTeam._id, status: req.releasedTeam.status });
    }
  }

  const updated = await Incident.findById(incident._id)
    .populate('assignedTeam', 'name code')
    .populate('timeline.updatedBy', 'name role');

  res.status(200).json({ success: true, data: updated });
};

/**
 * @desc    Rescue từ chối sự cố vừa được phân công
 * @route   PATCH /api/v1/incidents/:id/refuse
 * @access  Private (Rescue)
 */
exports.refuseIncident = async (req, res) => {
  const { reason } = req.body;

  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố' });
  }

  const userTeamId = req.user.rescueTeam?._id?.toString();
  if (!userTeamId || userTeamId !== incident.assignedTeam?.toString()) {
    return res.status(403).json({ success: false, message: 'Không có quyền từ chối sự cố này' });
  }

  if (incident.status !== 'ASSIGNED') {
    return res.status(400).json({ success: false, message: 'Chỉ có thể từ chối sự cố đang ở trạng thái ASSIGNED' });
  }

  incident.status = 'PENDING';
  incident.assignedTeam = null;
  incident.timeline.push({
    status: 'PENDING',
    updatedBy: req.user._id,
    note: reason || `Đội cứu hộ ${req.user.rescueTeam?.name || req.user.name} từ chối tiếp nhận sự cố`,
  });
  await incident.save();

  const releasedTeam = await releaseTeam({ ...incident.toObject(), assignedTeam: userTeamId });

  const updated = await Incident.findById(incident._id)
    .populate('reportedBy', 'name phone')
    .populate('assignedTeam', 'name code type status');

  const io = req.app.get('io');
  if (io) {
    emitIncidentUpdated(io, incident._id, { status: 'PENDING', code: incident.code, assignedTeam: null });
    io.to(`rescue-team:${userTeamId}`).emit('incident:refused', { incidentId: incident._id });
    if (releasedTeam) {
      io.to('dispatchers').emit('rescue:status-changed', { teamId: releasedTeam._id, status: releasedTeam.status });
    }
  }

  res.status(200).json({ success: true, data: updated });
};

/**
 * @desc    SOS khẩn cấp 1 chạm
 * @route   POST /api/v1/incidents/sos
 * @access  Private (Citizen)
 */
exports.triggerSOS = async (req, res) => {
  const { coordinates, description } = req.body;

  const resolvedAddress = await reverseGeocode(coordinates[1], coordinates[0]);
  const code = `SOS-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

  const incident = await Incident.create({
    code,
    type: 'OTHER',
    severity: 'CRITICAL',
    location: { type: 'Point', coordinates, address: resolvedAddress },
    description: description || 'CẢNH BÁO SOS KHẨN CẤP TỪ NGƯỜI DÂN',
    reportedBy: req.user._id,
    timeline: [{ status: 'PENDING', updatedBy: req.user._id, note: 'Kích hoạt SOS 1 chạm' }],
  });

  const io = req.app.get('io');
  if (io) emitSOSAlert(io, incident);

  await sendSOSAlert(incident);

  const assignedTeam = await autoAssignTeam(incident, io);
  if (!assignedTeam) await addToAssignQueue(incident._id.toString(), 30000);

  const updated = await Incident.findById(incident._id).populate('assignedTeam', 'name code');
  res.status(201).json({ success: true, data: updated });
};

/**
 * @desc    Hủy sự cố
 * @route   PATCH /api/v1/incidents/:id/cancel
 * @access  Private (Dispatcher, Admin)
 */
exports.cancelIncident = async (req, res) => {
  const { reason } = req.body;

  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố' });

  if (['COMPLETED', 'CANCELLED'].includes(incident.status)) {
    return res.status(400).json({ success: false, message: `Sự cố đã ở trạng thái ${incident.status}` });
  }

  incident.status = 'CANCELLED';
  incident.completedAt = new Date();
  incident.timeline.push({ status: 'CANCELLED', updatedBy: req.user._id, note: reason || 'Dispatcher hủy sự cố' });

  const releasedTeam = await releaseTeam(incident);
  await incident.save();

  const io = req.app.get('io');
  if (io) {
    emitIncidentUpdated(io, incident._id, { status: 'CANCELLED', code: incident.code });
    if (releasedTeam) {
      io.to('dispatchers').emit('rescue:status-changed', { teamId: releasedTeam._id, status: releasedTeam.status });
    }
  }

  res.status(200).json({ success: true, data: incident });
};
