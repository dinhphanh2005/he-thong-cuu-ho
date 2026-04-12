const Incident = require('../models/Incident');
const SystemConfig = require('../models/SystemConfig');
const { autoAssignTeam, releaseTeam } = require('../services/assignmentService');
const { emitNewIncident, emitIncidentUpdated, emitSOSAlert } = require('../services/socketService');
const { notifyCitizenCompleted, sendSOSAlert, notifyDispatcherRefused } = require('../services/notificationService');
const { reverseGeocode } = require('../services/geocodingService');
const { scheduleRetry, addToAssignQueue } = require('../jobs/autoAssignJob');
const { recalculateTeamStatus } = require('../services/teamAvailabilityService');
const logger = require('../utils/logger');

const ACTIVE_RESCUE_STATUSES = ['ASSIGNED', 'ARRIVED', 'PROCESSING', 'IN_PROGRESS'];
const RESCUE_STATUS_TRANSITIONS = {
  OFFERING: ['ASSIGNED', 'PENDING'],
  ASSIGNED: ['ARRIVED'],
  ARRIVED: ['PROCESSING'],
  PROCESSING: ['COMPLETED'],
  IN_PROGRESS: ['COMPLETED'],
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

  const config = await SystemConfig.getSingleton();
  if (config.algoSettings.isAutoAssignEnabled) {
    const assignedTeam = await autoAssignTeam(incident, io);
    if (!assignedTeam) await scheduleRetry(incident._id.toString());
  }

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
 * @desc    Sự cố đang xử lý của Citizen đang đăng nhập (chỉ lấy 1 cái mới nhất)
 * @route   GET /api/v1/incidents/my/active
 * @access  Private (Citizen)
 */
exports.getActiveCitizenIncident = async (req, res) => {
  const incident = await Incident.findOne({
    reportedBy: req.user._id,
    status: { $in: ['PENDING', 'ASSIGNED', 'ARRIVED', 'PROCESSING'] },
  })
    .populate('assignedTeam', 'name code type status currentLocation')
    .sort('-createdAt');

  res.status(200).json({ success: true, data: incident || null });
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
 * @desc    Lịch sử sự cố của Rescue team (Đã hoàn thành hoặc Hủy)
 * @route   GET /api/v1/incidents/rescue/history
 * @access  Private (Rescue)
 */
exports.getRescueHistory = async (req, res) => {
  const teamId = req.user.rescueTeam?._id;
  if (!teamId) {
    return res.status(403).json({ success: false, message: 'Bạn chưa được gắn với đội cứu hộ nào' });
  }

  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {
    assignedTeam: teamId,
    status: { $in: ['COMPLETED', 'CANCELLED'] },
  };

  const [incidents, total] = await Promise.all([
    Incident.find(filter)
      .populate('reportedBy', 'name phone')
      .sort('-completedAt -createdAt')
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
      // Idempotency check: If the status is already what we want, return success without duplicating timeline
      if (incident.status === status) {
        return res.status(200).json({ success: true, data: incident, message: 'Trạng thái đã được cập nhật trước đó' });
      }

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
      assignedTeam: incident.assignedTeam, // Quan trọng để đồng bộ các thành viên khác trong đội
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
 * @desc    Rescue chấp nhận sự cố đang được offer
 * @route   PATCH /api/v1/incidents/:id/accept
 * @access  Private (Rescue)
 */
exports.acceptIncident = async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố' });

  const teamId = req.user.rescueTeam?._id?.toString();
  if (incident.offeredTo?.toString() !== teamId) {
    return res.status(403).json({ success: false, message: 'Sự cố này không được offer cho đội của bạn' });
  }

  if (incident.status !== 'OFFERING') {
    return res.status(400).json({ success: false, message: 'Sự cố không còn ở trạng thái chờ xác nhận' });
  }

  if (new Date() > incident.offerExpiresAt) {
    return res.status(400).json({ success: false, message: 'Đã hết thời gian xác nhận (35s)' });
  }

  // Chuyển sang ASSIGNED
  incident.status = 'ASSIGNED';
  incident.assignedTeam = teamId;
  incident.offeredTo = null;
  incident.timeline.push({
    status: 'ASSIGNED',
    updatedBy: req.user._id,
    note: `Đội ${req.user.rescueTeam?.name} đã chấp nhận nhiệm vụ`,
  });
  await incident.save();

  // Cập nhật đội sang BUSY
  const RescueTeam = require('../models/RescueTeam');
  const team = await RescueTeam.findById(teamId);
  if (team) {
    team.status = 'BUSY';
    team.activeIncident = incident._id;
    await team.save();
    await recalculateTeamStatus(teamId);
  }

  const io = req.app.get('io');
  if (io) {
    emitIncidentUpdated(io, incident._id, { status: 'ASSIGNED', code: incident.code, assignedTeam: teamId });
    io.to('dispatchers').emit('rescue:status-changed', { teamId, status: 'BUSY' });
    // Thông báo cho người dân
    const { notifyCitizenAssigned } = require('../services/notificationService');
    await notifyCitizenAssigned(incident, req.user.rescueTeam?.name || 'Đội cứu hộ');
  }

  res.status(200).json({ success: true, data: incident });
};

/**
 * @desc    Rescue từ chối sự cố đang được offer
 * @route   PATCH /api/v1/incidents/:id/refuse
 * @access  Private (Rescue)
 */
exports.refuseIncident = async (req, res) => {
  const { reason } = req.body;
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố' });

  const teamId = req.user.rescueTeam?._id?.toString();
  const isOffered = incident.offeredTo?.toString() === teamId;
  const isAssigned = incident.assignedTeam?.toString() === teamId;

  if (!isOffered && !isAssigned) {
    return res.status(403).json({ success: false, message: 'Không có quyền từ chối sự cố này' });
  }

  // Lưu lại đội đã từ chối
  if (!incident.rejectedTeams.includes(teamId)) {
    incident.rejectedTeams.push(teamId);
  }

  incident.status = 'PENDING';
  const oldTeamId = incident.assignedTeam || incident.offeredTo;
  incident.assignedTeam = null;
  incident.offeredTo = null;
  incident.timeline.push({
    status: 'PENDING',
    updatedBy: req.user._id,
    note: reason || `Đội ${req.user.rescueTeam?.name} từ chối tiếp nhận (Lý do: Bận/Không phù hợp)`,
  });
  await incident.save();

  // Giải phóng đội
  const oldTeamState = await recalculateTeamStatus(oldTeamId);

  const io = req.app.get('io');
  if (io) {
    emitIncidentUpdated(io, incident._id, { status: 'PENDING', code: incident.code, assignedTeam: null });
    if (oldTeamState?.team) {
      io.to('dispatchers').emit('rescue:status-changed', {
        teamId: oldTeamState.team._id,
        status: oldTeamState.team.status,
      });
    }
  }

  // Kích hoạt tìm đội mới - đảm bảo luôn chạy dù io có hay không
  // Dây delay 500ms để đảm bảo recalculateTeamStatus của đội cũ đã hoàn tất trước khi tìm đội mới
  try {
    const config = await SystemConfig.getSingleton();
    const attempts = incident.assignmentAttempts || 0;
    if (config.algoSettings.isAutoAssignEnabled && attempts < 3) {
      logger.info(`Refuse: Kích hoạt tìm đội mới cho ${incident.code} (attempt ${attempts}), delay 500ms...`);
      await addToAssignQueue(incident._id.toString(), 500);
    } else {
      logger.warn(`Refuse: Không kích hoạt auto-assign · isAutoAssign=${config.algoSettings.isAutoAssignEnabled} attempts=${attempts}`);
    }
  } catch (err) {
    logger.error(`Refuse: Lỗi khi kích hoạt queue: ${err.message}`);
  }

  // Notify dispatchers (fire-and-forget)
  notifyDispatcherRefused(incident, req.user.rescueTeam?.name || 'Đội cứu hộ').catch(() => {});

  res.status(200).json({ success: true, data: incident });
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

  const config = await SystemConfig.getSingleton();
  if (config.algoSettings.isAutoAssignEnabled) {
    const assignedTeam = await autoAssignTeam(incident, io);
    if (!assignedTeam) await addToAssignQueue(incident._id.toString(), 30000);
  }

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
