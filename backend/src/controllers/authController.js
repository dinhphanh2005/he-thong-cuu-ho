const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { recalculateTeamStatus } = require('../services/teamAvailabilityService');

/**
 * @desc    Đăng ký Citizen
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.registerCitizen = async (req, res) => {
  const { name, email, phone, password } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { phone }] });
  if (exists) {
    return res.status(400).json({ success: false, message: 'Email hoặc SĐT đã được đăng ký' });
  }

  const user = await User.create({ name, email, phone, passwordHash: password, role: 'CITIZEN' });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    accessToken,
    refreshToken,
    data: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
};

/**
 * @desc    Đăng nhập (mọi role)
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  const { loginId, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: loginId }, { phone: loginId }],
  }).select('+passwordHash');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
  }

  if (user.mustChangePassword) {
    const accessToken = generateAccessToken(user._id);
    return res.status(200).json({
      success: true,
      mustChangePassword: true,
      accessToken,
      message: 'Vui lòng đổi mật khẩu trước khi tiếp tục.',
    });
  }

  user.lastLogin = new Date();
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  logger.info(`User ${user._id} (${user.role}) đăng nhập`);

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      availabilityStatus: user.availabilityStatus,
      rescueTeam: user.rescueTeam || null,
    },
  });
};

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp refresh token' });
  }

  // jwt.verify throws nếu invalid → Express v5 tự bắt
  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
  );

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ' });
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
};

/**
 * @desc    Lấy thông tin user hiện tại
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('rescueTeam', 'name code zone type status');
  res.status(200).json({ success: true, data: user });
};

/**
 * @desc    Đổi mật khẩu mặc định
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
exports.changePassword = async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  user.passwordHash = newPassword;
  user.mustChangePassword = false;
  user.lastLogin = new Date();
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, accessToken, refreshToken, message: 'Đổi mật khẩu thành công' });
};

/**
 * @desc    Đăng xuất
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    refreshToken: null,
    ...(req.user.role === 'RESCUE' ? { availabilityStatus: 'OFFLINE' } : {}),
  });

  if (req.user.role === 'RESCUE' && req.user.rescueTeam?._id) {
    const teamState = await recalculateTeamStatus(req.user.rescueTeam._id);
    const io = req.app.get('io');
    if (io && teamState) {
      io.to('dispatchers').emit('rescue:status-changed', { teamId: teamState.team._id, status: teamState.team.status });
    }
  }

  res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
};

/**
 * @desc    Cập nhật FCM token
 * @route   PATCH /api/v1/auth/fcm-token
 * @access  Private
 */
exports.updateFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return res.status(400).json({ success: false, message: 'fcmToken không được rỗng' });
  }
  await User.findByIdAndUpdate(req.user._id, { fcmToken });
  res.status(200).json({ success: true, message: 'Cập nhật FCM token thành công' });
};
