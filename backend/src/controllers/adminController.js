const User = require('../models/User');
const RescueTeam = require('../models/RescueTeam');
const Incident = require('../models/Incident');
const SystemConfig = require('../models/SystemConfig');
const { triggerManualReport } = require('../jobs/dailyReportJob');
const { decorateTeam, recalculateTeamStatus } = require('../services/teamAvailabilityService');

// ==================== DISPATCHER ====================

exports.createDispatcher = async (req, res) => {
  const { name, email, phone, role } = req.body;
  const allowedRoles = ['DISPATCHER', 'ADMIN'];
  const assignedRole = allowedRoles.includes(role) ? role : 'DISPATCHER';

  const exists = await User.findOne({ $or: [{ email }, { phone }] });
  if (exists) return res.status(400).json({ success: false, message: 'Email hoặc SĐT đã tồn tại' });

  const defaultPassword = `DieuPhoi@${phone.slice(-4)}`;
  const dispatcher = await User.create({
    name, email, phone,
    passwordHash: defaultPassword,
    role: assignedRole,
    mustChangePassword: true,
  });

  res.status(201).json({
    success: true,
    message: `Tạo tài khoản ${assignedRole} thành công`,
    data: { name: dispatcher.name, email: dispatcher.email, phone: dispatcher.phone, role: assignedRole, defaultPassword },
  });
};

exports.getAllDispatchers = async (req, res) => {
  const dispatchers = await User.find({ role: 'DISPATCHER' }).select('-passwordHash -refreshToken');
  res.status(200).json({ success: true, count: dispatchers.length, data: dispatchers });
};

// ==================== RESCUE TEAMS ====================

exports.createRescueTeam = async (req, res) => {
  const { name, code, type, zone, coordinates, capabilities } = req.body;

  const team = await RescueTeam.create({
    name, code, type, zone,
    capabilities: capabilities || [],
    currentLocation: { type: 'Point', coordinates },
    status: 'OFFLINE',
  });

  res.status(201).json({ success: true, data: decorateTeam(team, 0) });
};

exports.updateRescueTeam = async (req, res) => {
  const { name, type, zone, capabilities, coordinates } = req.body;
  const update = {};
  if (name) update.name = name;
  if (type) update.type = type;
  if (zone) update.zone = zone;
  if (capabilities) update.capabilities = capabilities;
  if (coordinates) update['currentLocation.coordinates'] = coordinates;

  const team = await RescueTeam.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!team) return res.status(404).json({ success: false, message: 'Không tìm thấy đội cứu hộ' });

  res.status(200).json({ success: true, data: team });
};

exports.deleteRescueTeam = async (req, res) => {
  const team = await RescueTeam.findById(req.params.id);
  if (!team) return res.status(404).json({ success: false, message: 'Không tìm thấy đội cứu hộ' });

  if (team.status === 'BUSY') {
    return res.status(400).json({ success: false, message: 'Đội đang xử lý sự cố, không thể xóa' });
  }

  await team.deleteOne();
  await User.updateMany({ rescueTeam: team._id }, { $unset: { rescueTeam: 1 } });

  res.status(200).json({ success: true, message: 'Đã xóa đội cứu hộ' });
};

exports.toggleSuspendTeam = async (req, res) => {
  const team = await RescueTeam.findById(req.params.id);
  if (!team) return res.status(404).json({ success: false, message: 'Không tìm thấy đội cứu hộ' });

  if (team.status === 'SUSPENDED') {
    team.status = 'OFFLINE'; // Re-calculating will set it to AVAILABLE if enough members are online
    await team.save();
    await recalculateTeamStatus(team._id);
  } else {
    team.status = 'SUSPENDED';
    await team.save();
  }

  res.status(200).json({
    success: true,
    message: `Đội đã ${team.status === 'SUSPENDED' ? 'bị đình chỉ' : 'hoạt động trở lại'}`,
    data: team
  });
};

// ==================== RESCUE MEMBERS ====================

exports.createRescueMember = async (req, res) => {
  const { name, email, phone, teamId, memberRole } = req.body;

  const team = await RescueTeam.findById(teamId);
  if (!team) return res.status(404).json({ success: false, message: 'Không tìm thấy đội cứu hộ' });

  const exists = await User.findOne({ $or: [{ email }, { phone }] });
  if (exists) return res.status(400).json({ success: false, message: 'Email hoặc SĐT đã tồn tại' });

  const defaultPassword = `CuuHo@${phone.slice(-4)}`;
  const member = await User.create({
    name,
    email,
    phone,
    passwordHash: defaultPassword,
    role: 'RESCUE',
    rescueTeam: teamId,
    mustChangePassword: true,
    availabilityStatus: 'OFFLINE',
  });

  team.members.push({ userId: member._id, role: memberRole || 'MEMBER' });
  await team.save();
  await recalculateTeamStatus(teamId);

  res.status(201).json({
    success: true,
    message: 'Cấp tài khoản nhân viên cứu hộ thành công',
    data: { name: member.name, phone: member.phone, teamName: team.name, defaultPassword },
  });
};

// ==================== USERS ====================

exports.getAllUsers = async (req, res) => {
  const { role, isActive, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshToken')
      .populate('rescueTeam', 'name code')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: users.length, total, data: users });
};

exports.toggleUserActive = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
  if (user.role === 'ADMIN') return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản Admin' });

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  if (user.role === 'RESCUE' && user.rescueTeam) {
    await recalculateTeamStatus(user.rescueTeam);
  }

  res.status(200).json({
    success: true,
    message: `Tài khoản đã ${user.isActive ? 'kích hoạt' : 'bị khóa'}`,
    data: { _id: user._id, name: user.name, isActive: user.isActive },
  });
};

exports.resetUserPassword = async (req, res) => {
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

  const defaultPassword = user.role === 'DISPATCHER' ? `DieuPhoi@${user.phone.slice(-4)}` : `CuuHo@${user.phone.slice(-4)}`;
  user.passwordHash = defaultPassword;
  user.mustChangePassword = true;
  await user.save();

  res.status(200).json({ success: true, message: 'Reset mật khẩu thành công', data: { name: user.name, defaultPassword } });
};

// ==================== DASHBOARD & REPORTS ====================

exports.getDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalIncidents, todayIncidents, activeIncidents, totalTeams, activeTeams, totalUsers] =
    await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ createdAt: { $gte: today } }),
      Incident.countDocuments({ status: { $in: ['PENDING', 'ASSIGNED', 'ARRIVED', 'PROCESSING'] } }),
      RescueTeam.countDocuments(),
      RescueTeam.countDocuments({ status: 'AVAILABLE' }),
      User.countDocuments({ isActive: true }),
    ]);

  res.status(200).json({
    success: true,
    data: { totalIncidents, todayIncidents, activeIncidents, totalTeams, activeTeams, totalUsers },
  });
};

exports.triggerDailyReport = async (req, res) => {
  const { targetDate } = req.body;
  await triggerManualReport(targetDate);
  res.status(200).json({ success: true, message: 'Đã đưa báo cáo vào hàng đợi xử lý' });
};

// ==================== SYSTEM CONFIGURATION ====================

exports.getSystemConfig = async (req, res) => {
  const config = await SystemConfig.getSingleton();
  res.status(200).json({ success: true, data: config });
};

exports.updateSystemConfig = async (req, res) => {
  const config = await SystemConfig.getSingleton();
  
  // Update fields from request body selectively to avoid overwriting with undefined
  const updates = req.body;
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      config[key] = updates[key];
    }
  });

  await config.save();

  // Socket.IO realtime update
  const io = req.app.get('io');
  if (io) {
    io.emit('system:config-updated', config);
  }

  res.status(200).json({ success: true, message: 'Cập nhật cấu hình thành công', data: config });
};
