const RescueTeam = require('../models/RescueTeam');
const Incident = require('../models/Incident');
const User = require('../models/User');
const { decorateTeam, recalculateTeamStatus } = require('../services/teamAvailabilityService');
const { getRoute } = require('../services/routingService');

/**
 * @desc    Danh sách tất cả đội cứu hộ
 * @route   GET /api/v1/rescue-teams
 * @access  Private (Dispatcher, Admin)
 */
exports.getAllTeams = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.zone) filter.zone = req.query.zone;

  let teams = await RescueTeam.find(filter)
    .populate('activeIncident', 'code status severity location assignedTeam')
    .populate('members.userId', 'name phone availabilityStatus isActive');

  // Self-healing: dọn dẹp các đội có activeIncident bị mồ côi (orphaned)
  let changed = false;
  teams = await Promise.all(teams.map(async (team) => {
    if (team.activeIncident) {
      const inc = team.activeIncident;
      const isCompletedOrCanceled = ['COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL'].includes(inc.status);
      const isAssignedToOther = inc.assignedTeam && inc.assignedTeam.toString() !== team._id.toString();
      
      // Nếu sự cố đã xong, hoặc đã gán cho nhóm khác
      if (isCompletedOrCanceled || isAssignedToOther) {
        team.activeIncident = null;
        if (team.status === 'BUSY' || team.status === 'PROPOSED') {
          team.status = 'AVAILABLE';
        }
        await RescueTeam.updateOne({ _id: team._id }, { $set: { activeIncident: null, status: team.status } });
        changed = true;
      }
    } else if (team.status === 'BUSY' || team.status === 'PROPOSED') {
      team.status = 'AVAILABLE';
      await RescueTeam.updateOne({ _id: team._id }, { $set: { status: 'AVAILABLE' } });
      changed = true;
    }
    return team;
  }));

  if (changed) {
    const io = req.app.get('io');
    if (io) {
      teams.forEach(t => io.to('dispatchers').emit('rescue:status-changed', { teamId: t._id, status: t.status }));
    }
  }

  res.status(200).json({ success: true, count: teams.length, data: teams.map((team) => decorateTeam(team)) });
};

/**
 * @desc    Chi tiết một đội
 * @route   GET /api/v1/rescue-teams/:id
 * @access  Private (Dispatcher, Admin, Rescue)
 */
exports.getTeamById = async (req, res) => {
  const team = await RescueTeam.findById(req.params.id)
    .populate('activeIncident', 'code status severity location description')
    .populate('members.userId', 'name phone email availabilityStatus isActive');

  if (!team) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đội cứu hộ' });
  }

  if (req.user.role === 'RESCUE' && req.user.rescueTeam?._id?.toString() !== team._id.toString()) {
    return res.status(403).json({ success: false, message: 'Không có quyền xem đội này' });
  }

  res.status(200).json({ success: true, data: decorateTeam(team) });
};

/**
 * @desc    Thông tin đội của Rescue user đang đăng nhập
 * @route   GET /api/v1/rescue-teams/my-team
 * @access  Private (Rescue)
 */
exports.getMyTeam = async (req, res) => {
  const teamId = req.user.rescueTeam?._id;
  if (!teamId) {
    return res.status(404).json({ success: false, message: 'Bạn chưa được gắn với đội nào' });
  }

  const team = await RescueTeam.findById(teamId)
    .populate('activeIncident', 'code status severity location description photos')
    .populate('members.userId', 'name phone availabilityStatus isActive');

  res.status(200).json({ success: true, data: decorateTeam(team) });
};

/**
 * @desc    Cập nhật GPS (Rescue app gọi mỗi 10 giây)
 * @route   PATCH /api/v1/rescue-teams/location
 * @access  Private (Rescue)
 */
exports.updateLocation = async (req, res) => {
  const { coordinates } = req.body;

  const teamId = req.user.rescueTeam?._id;
  if (!teamId) {
    return res.status(403).json({ success: false, message: 'Tài khoản chưa gắn với đội nào' });
  }

  const team = await RescueTeam.findByIdAndUpdate(
    teamId,
    { 'currentLocation.coordinates': coordinates, lastLocationUpdate: new Date() },
    { new: true, runValidators: false }
  );

  if (!team) {
    return res.status(404).json({ success: false, message: 'Đội cứu hộ không tồn tại' });
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('rescue:location', {
      teamId: team._id,
      teamName: team.name,
      coordinates,
      updatedAt: new Date(),
    });
  }

  res.status(200).json({ success: true, data: { teamId: team._id, coordinates } });
};

/**
 * @desc    Cập nhật trạng thái online/offline của rescue member, rồi recompute team status
 * @route   PATCH /api/v1/rescue-teams/availability
 * @access  Private (Rescue)
 */
exports.updateAvailability = async (req, res) => {
  const { status } = req.body;
  if (!['ONLINE', 'OFFLINE'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ. Dùng ONLINE hoặc OFFLINE' });
  }

  const teamId = req.user.rescueTeam?._id;
  if (!teamId) return res.status(403).json({ success: false, message: 'Tài khoản chưa gắn với đội nào' });

  await User.findByIdAndUpdate(req.user._id, { availabilityStatus: status });
  const teamState = await recalculateTeamStatus(teamId);
  if (!teamState) return res.status(404).json({ success: false, message: 'Đội không tồn tại' });

  const io = req.app.get('io');
  if (io) io.to('dispatchers').emit('rescue:status-changed', { teamId: teamState.team._id, status: teamState.team.status });

  res.status(200).json({
    success: true,
    data: {
      userId: req.user._id,
      availabilityStatus: status,
      teamId: teamState.team._id,
      teamStatus: teamState.team.status,
      onlineMembersCount: teamState.onlineMembersCount,
      minimumOnlineMembers: teamState.minimumOnlineMembers,
    },
  });
};

/**
 * @desc    Dispatcher phân công thủ công
 * @route   PATCH /api/v1/rescue-teams/:teamId/assign/:incidentId
 * @access  Private (Dispatcher, Admin)
 */
exports.assignTeamToIncident = async (req, res) => {
  const { teamId, incidentId } = req.params;
  const io = req.app.get('io');

  const releaseTeamAndBroadcast = async (targetTeamId) => {
    const state = await recalculateTeamStatus(targetTeamId);
    if (io && state?.team) {
      io.to('dispatchers').emit('rescue:status-changed', {
        teamId: state.team._id,
        status: state.team.status,
      });
    }
    return state;
  };

  const [team, incident] = await Promise.all([
    RescueTeam.findById(teamId),
    Incident.findById(incidentId),
  ]);

  if (!team) return res.status(404).json({ success: false, message: 'Không tìm thấy đội cứu hộ' });
  if (!incident) return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố' });

  const teamState = await recalculateTeamStatus(teamId);
  if (!teamState || teamState.team.status !== 'AVAILABLE') {
    return res.status(400).json({
      success: false,
      message: `Đội hiện ${teamState?.team.status || 'không khả dụng'}, cần tối thiểu 2 thành viên online để nhận nhiệm vụ`,
    });
  }

  if (['COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL'].includes(incident.status)) {
    return res.status(400).json({ success: false, message: `Sự cố đã ${incident.status}` });
  }

  // 1. Dọn dẹp đội đang được ĐỀ XUẤT (OFFERING) nếu có
  if (incident.offeredTo) {
    const offeredTeamId = incident.offeredTo.toString();
    if (offeredTeamId !== teamId) {
      await releaseTeamAndBroadcast(offeredTeamId);
      // Rút lại đề xuất phía app của đội cứu hộ
      if (io) io.to(`rescue-team:${offeredTeamId}`).emit('incident:updated', { _id: incidentId, status: 'CANCELLED' });
    }
  }

  // 2. Dọn dẹp đội ĐÃ ĐƯỢC GÁN trước đó (trong trường hợp Dispatcher đổi ý gán đội khác)
  if (incident.assignedTeam && incident.assignedTeam.toString() !== teamId) {
    const oldTeamId = incident.assignedTeam.toString();
    const oldTeam = await RescueTeam.findById(oldTeamId);
    if (oldTeam) {
      oldTeam.activeIncident = null;
      await oldTeam.save();
      await releaseTeamAndBroadcast(oldTeamId);
    }
    // Thông báo cho đội cũ biết họ đã được giải phóng
    if (io) io.to(`rescue-team:${oldTeamId}`).emit('incident:updated', { _id: incidentId, status: 'CANCELLED' });
  }

  // 3. Dọn dẹp mọi liên kết activeIncident bị kẹt trên các đội khác (nếu có)
  const staleTeams = await RescueTeam.find({
    activeIncident: incidentId,
    _id: { $ne: teamId },
  }).select('_id');

  if (staleTeams.length > 0) {
    await RescueTeam.updateMany(
      {
        activeIncident: incidentId,
        _id: { $ne: teamId },
      },
      { $set: { activeIncident: null } }
    );

    for (const staleTeam of staleTeams) {
      await releaseTeamAndBroadcast(staleTeam._id);
    }
  }

  incident.assignedTeam = teamId;
  incident.status = 'ASSIGNED';
  incident.offeredTo = null; // Clear proposal
  incident.offerExpiresAt = null; // Clear timeout

  // Calculate route and ETAs upon dispatcher assignment
  const routeInfo = await getRoute(team.currentLocation.coordinates, incident.location.coordinates);
  if (routeInfo) {
    incident.routingPath = routeInfo.path;
    incident.estimatedArrival = new Date(Date.now() + routeInfo.duration * 1000);
  }

  incident.timeline.push({
    status: 'ASSIGNED',
    updatedBy: req.user._id,
    note: `Dispatcher ${req.user.name} chỉ định trực tiếp đội ${team.name} (${team.code})`,
  });
  await incident.save();

  team.activeIncident = incidentId;
  team.status = 'BUSY';
  await team.save();

  if (io) {
    io.to('dispatchers').emit('rescue:status-changed', { teamId: team._id, status: team.status });
    io.emit('rescue:assigned', {
      incidentId,
      rescueTeam: { _id: team._id, name: team.name, code: team.code, currentLocation: team.currentLocation },
    });
    io.emit('incident:updated', { id: incidentId, status: 'ASSIGNED', assignedTeam: team._id });
    io.to(`rescue-team:${teamId}`).emit('incident:assigned-to-me', {
      incident: { _id: incident._id, code: incident.code, type: incident.type, severity: incident.severity, location: incident.location },
    });
  }

  res.status(200).json({
    success: true,
    message: `Đã phân công đội ${team.name} cho sự cố ${incident.code}`,
    data: { incident, team },
  });
};

/**
 * @desc    Lấy danh sách đội cứu hộ đang active cho Citizen (tìm từ gần đến xa)
 * @route   GET /api/v1/rescue-teams/active
 * @access  Private (Citizen, App users)
 */
exports.getActiveTeamsForCitizen = async (req, res) => {
  const { lat, lng } = req.query;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (!lat || !lng || isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ success: false, message: 'Thiếu hoặc sai tọa độ lat, lng' });
  }

  // Các mốc bán kính tìm kiếm (mét)
  const searchRanges = [5000, 10000, 20000, 50000]; // 5km, 10km, 20km, 50km
  let teams = [];

  for (const radius of searchRanges) {
    teams = await RescueTeam.find({
      status: { $in: ['AVAILABLE', 'BUSY'] },
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius,
        },
      },
    }).select('name code type status currentLocation');

    if (teams.length > 0) {
      break; 
    }
  }

  res.status(200).json({ success: true, count: teams.length, data: teams });
};
