const mongoose = require('mongoose');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { recalculateTeamStatus } = require('../services/teamAvailabilityService');
const { sendOTPEmail, sendOTPSMS } = require('../services/notificationService');

/**
 * @desc    Đăng ký Citizen
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.registerCitizen = async (req, res) => {
  const { name, email, phone, password } = req.body;
  logger.info(`[register] Yêu cầu đăng ký: email=${email}, phone=${phone}`);

  const exists = await User.findOne({ $or: [{ email }, { phone }] });
  if (exists) {
    logger.warn(`[register] Email hoặc SĐT đã tồn tại: email=${email}, phone=${phone}`);
    return res.status(400).json({ success: false, message: 'Email hoặc SĐT đã được đăng ký' });
  }

  const user = await User.create({ name, email, phone, passwordHash: password, role: 'CITIZEN' });
  logger.info(`[register] Tạo user thành công: _id=${user._id}, email=${user.email}`);

  const sessionId = new mongoose.Types.ObjectId().toString();
  const accessToken = generateAccessToken(user._id, sessionId);
  const refreshToken = generateRefreshToken(user._id, sessionId);
  user.refreshToken = refreshToken;
  user.currentSessionId = sessionId;
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
  logger.info(`[login] Yêu cầu đăng nhập: loginId="${loginId}"`);

  if (!loginId || !password) {
    logger.warn(`[login] Thiếu loginId hoặc password`);
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin đăng nhập' });
  }

  const user = await User.findOne({
    $or: [{ email: loginId }, { phone: loginId }],
  }).select('+passwordHash');

  if (!user) {
    logger.warn(`[login] Không tìm thấy user với loginId="${loginId}"`);
    return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác' });
  }

  logger.info(`[login] Tìm thấy user: _id=${user._id}, email=${user.email}, role=${user.role}, isActive=${user.isActive}`);

  const passwordMatch = await user.matchPassword(password);
  logger.info(`[login] Kiểm tra mật khẩu: match=${passwordMatch}`);

  if (!passwordMatch) {
    logger.warn(`[login] Mật khẩu không khớp cho user _id=${user._id}`);
    return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác' });
  }

  if (!user.isActive) {
    logger.warn(`[login] Tài khoản bị khóa: _id=${user._id}`);
    return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
  }

  if (user.mustChangePassword) {
    logger.info(`[login] User phải đổi mật khẩu: _id=${user._id}`);
    const accessToken = generateAccessToken(user._id);
    return res.status(200).json({
      success: true,
      mustChangePassword: true,
      accessToken,
      message: 'Vui lòng đổi mật khẩu trước khi tiếp tục.',
    });
  }

  // Kiểm tra cấu hình 2FA
  const SystemConfig = require('../models/SystemConfig');
  const config = await SystemConfig.getSingleton();
  const systemAuth2FA = config.securitySettings?.require2FA && ['ADMIN', 'DISPATCHER'].includes(user.role);
  const userAuth2FA = user.settings?.security?.twoFactor === true;

  if (systemAuth2FA || userAuth2FA) {
    // Để tiện Test và QA không cần mò trong hàng ngàn dòng Log Terminal:
    // Môi trường Dev sẽ luôn sinh mã tĩnh 123456. Môi trường thật (Production) mới sinh mã Random.
    const isDev = process.env.NODE_ENV !== 'production';
    const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    
    user.otpCode = otp;
    user.otpExpire = Date.now() + 5 * 60000;
    await user.save({ validateBeforeSave: false });

    if (!isDev) {
      logger.info(`[2FA] MÃ OTP ĐĂNG NHẬP CHO TÀI KHOẢN ${user.email} LÀ: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      require2FA: true,
      userId: user._id,
      message: 'Vui lòng nhập mã OTP vừa được gửi đến email/SĐT.',
    });
  }

  user.lastLogin = new Date();
  const sessionId = new mongoose.Types.ObjectId().toString();
  const jwtSessionTimeoutMin = config.securitySettings?.jwtSessionTimeoutMin || 120;
  const expiresIn = Math.floor(jwtSessionTimeoutMin * 60) + 's';
  const accessToken = generateAccessToken(user._id, sessionId, expiresIn);
  const refreshToken = generateRefreshToken(user._id, sessionId);

  // Kick phìn cũ ra khỏi Socket.IO trước khi lưu session mới vào DB
  // req.app là Express application instance, có thể dùng trong bất kỳ middleware/controller
  const io = req.app.get('io');
  if (io && user.currentSessionId) {
    io.to(`user:${user._id}`).emit('auth:session-invalidated', {
      reason: 'Tài khoản vừa được đăng nhập từ thiết bị khác. Phîn làm việc này đã kết thúc.',
    });
    logger.info(`[login] ⚠️  Kick old session: userId=${user._id}, old.sid=${user.currentSessionId}`);
  }

  user.refreshToken = refreshToken;
  user.currentSessionId = sessionId;
  await user.save({ validateBeforeSave: false });

  logger.info(`[login] ✅ Đăng nhập thành công: _id=${user._id}, role=${user.role}, sessionId=${sessionId}`);

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
  logger.info(`[refreshToken] Yêu cầu refresh token`);

  if (!refreshToken) {
    logger.warn(`[refreshToken] Không có refresh token trong body`);
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp refresh token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    logger.info(`[refreshToken] Token hợp lệ, userId=${decoded.id}`);
  } catch (err) {
    logger.warn(`[refreshToken] Token không hợp lệ hoặc hết hạn: ${err.message}`);
    return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    logger.warn(`[refreshToken] Token không khớp DB hoặc user không tìm thấy: userId=${decoded.id}`);
    return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ' });
  }

  const sessionId = user.currentSessionId || new mongoose.Types.ObjectId().toString();
  const newAccessToken = generateAccessToken(user._id, sessionId);
  const newRefreshToken = generateRefreshToken(user._id, sessionId);
  user.refreshToken = newRefreshToken;
  user.currentSessionId = sessionId;
  await user.save({ validateBeforeSave: false });

  logger.info(`[refreshToken] ✅ Refresh thành công: userId=${user._id}`);
  res.status(200).json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
};

/**
 * @desc    Lấy thông tin user hiện tại
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  logger.info(`[getMe] userId=${req.user._id}`);
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
  logger.info(`[changePassword] userId=${req.user._id}`);

  const user = await User.findById(req.user._id).select('+passwordHash');
  user.passwordHash = newPassword;
  user.mustChangePassword = false;
  user.lastLogin = new Date();
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  logger.info(`[changePassword] ✅ Đổi mật khẩu thành công: userId=${user._id}`);
  res.status(200).json({ success: true, accessToken, refreshToken, message: 'Đổi mật khẩu thành công' });
};

/**
 * @desc    Đăng xuất
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  logger.info(`[logout] userId=${req.user._id}, role=${req.user.role}`);

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

  logger.info(`[logout] ✅ Đăng xuất thành công: userId=${req.user._id}`);
  res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
};

/**
 * @desc    Cập nhật FCM token
 * @route   PATCH /api/v1/auth/fcm-token
 * @access  Private
 */
exports.updateFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  logger.info(`[updateFcmToken] userId=${req.user._id}, fcmToken=${fcmToken ? fcmToken.slice(0, 20) + '...' : 'EMPTY'}`);

  if (!fcmToken) {
    return res.status(400).json({ success: false, message: 'fcmToken không được rỗng' });
  }
  await User.findByIdAndUpdate(req.user._id, { fcmToken });
  logger.info(`[updateFcmToken] ✅ Cập nhật thành công: userId=${req.user._id}`);
  res.status(200).json({ success: true, message: 'Cập nhật FCM token thành công' });
};

/**
 * @desc    Gửi mã OTP xác thực
 * @route   POST /api/v1/auth/send-otp
 * @access  Public
 */
exports.sendOTP = async (req, res) => {
  const { loginId, type = 'email' } = req.body;
  logger.info(`[sendOTP] loginId="${loginId}", type=${type}`);

  const user = await User.findOne({
    $or: [{ email: loginId }, { phone: loginId }],
  });

  if (!user) {
    logger.warn(`[sendOTP] Không tìm thấy user: loginId="${loginId}"`);
    return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  const expire = new Date(Date.now() + 5 * 60 * 1000);

  user.otpCode = otp;
  user.otpExpire = expire;
  await user.save({ validateBeforeSave: false });

  if (!isDev) {
    logger.info(`[sendOTP] OTP email qua cho ${user.email} LÀ: ${otp}`);
  }

  try {
    if (type === 'sms' || type === 'phone') {
      await sendOTPSMS(user.phone, otp);
      logger.info(`[sendOTP] Gửi SMS thành công: phone=${user.phone}`);
    } else {
      await sendOTPEmail(user.email, otp);
      logger.info(`[sendOTP] Gửi email thành công: email=${user.email}`);
    }
  } catch (sendErr) {
    logger.error(`[sendOTP] Gửi OTP thất bại: ${sendErr.message}`);
    return res.status(500).json({ success: false, message: `Không thể gửi OTP qua ${type}: ${sendErr.message}` });
  }

  res.status(200).json({ success: true, message: `Mã OTP đã được gửi qua ${type}` });
};

/**
 * @desc    Xác thực mã OTP
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
  const { loginId, otp } = req.body;
  logger.info(`[verifyOTP] loginId="${loginId}"`);

  if (!otp) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mã OTP' });
  }

  const user = await User.findOne({
    $or: [{ email: loginId }, { phone: loginId }],
  });

  if (!user) {
    logger.warn(`[verifyOTP] Không tìm thấy user: loginId="${loginId}"`);
    return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
  }

  if (!user.otpCode || user.otpCode !== otp) {
    logger.warn(`[verifyOTP] OTP không khớp: userId=${user._id}, nhập="${otp}", lưu="${user.otpCode}"`);
    return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
  }

  if (new Date() > user.otpExpire) {
    logger.warn(`[verifyOTP] OTP hết hạn: userId=${user._id}, hết hạn lúc ${user.otpExpire}`);
    return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn' });
  }

  user.otpCode = null;
  user.otpExpire = null;
  await user.save({ validateBeforeSave: false });

  logger.info(`[verifyOTP] ✅ Xác thực thành công: userId=${user._id}`);
  res.status(200).json({ success: true, message: 'Xác thực tài khoản thành công' });
};

/**
 * @desc    Xác thực 2FA lúc Login và cấp Token
 * @route   POST /api/v1/auth/verify-2fa
 * @access  Public
 */
exports.verify2FA = async (req, res) => {
  const { userId, otpCode } = req.body;
  if (!userId || !otpCode) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin xác thực' });
  }

  const user = await User.findById(userId);
  if (!user || user.otpCode !== otpCode || Date.now() > user.otpExpire) {
    return res.status(401).json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã quá hạn 5 phút' });
  }

  user.otpCode = null;
  user.otpExpire = null;
  user.lastLogin = new Date();
  
  const SystemConfig = require('../models/SystemConfig');
  const config = await SystemConfig.getSingleton();
  const jwtSessionTimeoutMin = config.securitySettings?.jwtSessionTimeoutMin || 120;
  const expiresIn = Math.floor(jwtSessionTimeoutMin * 60) + 's';

  const sessionId = new mongoose.Types.ObjectId().toString();
  const accessToken = generateAccessToken(user._id, sessionId, expiresIn);
  const refreshToken = generateRefreshToken(user._id, sessionId);

  const io = req.app.get('io');
  if (io && user.currentSessionId) {
    io.to(`user:${user._id}`).emit('auth:session-invalidated', {
      reason: 'Tài khoản vừa được đăng nhập từ thiết bị khác. Phiên làm việc này đã kết thúc.',
    });
    logger.info(`[verify2FA] ⚠️ Kick old session: userId=${user._id}, old.sid=${user.currentSessionId}`);
  }

  user.refreshToken = refreshToken;
  user.currentSessionId = sessionId;
  await user.save({ validateBeforeSave: false });

  logger.info(`[verify2FA] ✅ Login thành công qua 2FA: userId=${user._id}`);
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
 * @desc    Cập nhật cài đặt cá nhân của user (notifications, mapConfig, v.v.)
 * @route   PATCH /api/v1/auth/settings
 * @access  Private
 */
exports.updateSettings = async (req, res) => {
  const userId = req.user._id;
  logger.info(`[updateSettings] userId=${userId}`);

  // Deep merge settings — giữ các key không được gửi lên
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

  const incoming = req.body;

  // Chỉ cho phép update các key hợp lệ trong settings
  const allowedTopKeys = ['notifications', 'mapConfig', 'security'];
  allowedTopKeys.forEach((key) => {
    if (incoming[key] !== undefined) {
      if (!user.settings[key]) user.settings[key] = {};
      user.settings[key] = { ...user.settings[key], ...incoming[key] };
    }
  });

  // Hỗ trợ flat key (ví dụ: { name: 'Nguyễn A' }) — cập nhật trực tiếp lên user
  const profileKeys = ['name'];
  profileKeys.forEach((key) => {
    if (incoming[key] !== undefined) {
      user[key] = incoming[key];
    }
  });

  await user.save({ validateBeforeSave: false });

  // Emit realtime tới tất cả tabs/thiết bị của cùng user
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${userId}`).emit('user:settings-updated', {
      settings: user.settings,
      name: user.name,
    });
    logger.info(`[updateSettings] ✅ Emit user:settings-updated tới user:${userId}`);
  }

  res.status(200).json({
    success: true,
    message: 'Cài đặt đã được lưu và đồng bộ',
    data: user.settings,
  });
};

/**
 * @desc    Yêu cầu cấp tài khoản Dispatcher
 * @route   POST /api/v1/auth/request-access
 * @access  Public
 */
exports.registerDispatcherRequest = async (req, res) => {
  const { name, email, phone, reason } = req.body;
  if (!email || !name) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đủ Tên và Email' });
  }

  logger.info(`[requestAccess] Yêu cầu từ: ${email} (${name})`);
  
  // Trong thực tế sẽ lưu vào bảng 'AccessRequests' hoặc gửi mail cho Admin.
  // Demo này chúng ta trả về thành công để UI hoạt động.
  res.status(200).json({ 
    success: true, 
    message: 'Yêu cầu của bạn đã được gửi tới Quản trị viên. Chúng tôi sẽ phản hồi qua Email sớm nhất.' 
  });
};

/**
 * @desc    Đặt lại mật khẩu bằng mã OTP
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin đặt lại mật khẩu' });
  }

  const user = await User.findOne({ email });
  if (!user || user.otpCode !== otp || Date.now() > user.otpExpire) {
    return res.status(401).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
  }

  user.passwordHash = newPassword;
  user.otpCode = null;
  user.otpExpire = null;
  await user.save({ validateBeforeSave: false });

  logger.info(`[resetPassword] ✅ Đặt lại mật khẩu thành công: ${email}`);
  res.status(200).json({ success: true, message: 'Mật khẩu đã được cập nhật thành công' });
};

module.exports = exports;
