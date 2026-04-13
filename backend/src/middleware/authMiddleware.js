const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Express v5: jwt.verify throws nếu token không hợp lệ
 * → Express v5 tự forward tới error middleware, không cần try/catch
 */
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const routeLabel = `[protect] ${req.method} ${req.originalUrl}`;

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn(`${routeLabel} → Không có Bearer token`);
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập. Vui lòng đăng nhập!',
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info(`${routeLabel} → Token hợp lệ: userId=${decoded.id}, sid=${decoded.sid || 'N/A'}`);
  } catch (err) {
    logger.warn(`${routeLabel} → Token không hợp lệ: ${err.message}`);
    return res.status(401).json({ success: false, message: `Token không hợp lệ: ${err.message}` });
  }

  const user = await User.findById(decoded.id).populate('rescueTeam', 'name code zone status');

  if (!user) {
    logger.warn(`${routeLabel} → Không tìm thấy user _id=${decoded.id}`);
    return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
  }

  // Concurrent session check
  if (decoded.sid && user.currentSessionId && decoded.sid !== user.currentSessionId) {
    logger.warn(`${routeLabel} → Session mismatch: token.sid=${decoded.sid}, db.sid=${user.currentSessionId}, userId=${user._id}`);
    return res.status(401).json({ 
      success: false, 
      message: 'Phiên làm việc đã hết hạn hoặc được đăng nhập ở thiết bị khác.' 
    });
  }

  if (!user.isActive) {
    logger.warn(`${routeLabel} → Tài khoản bị khóa: userId=${user._id}`);
    return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa.' });
  }

  logger.info(`${routeLabel} → ✅ Authenticated: userId=${user._id}, role=${user.role}`);
  req.user = user;
  next();
};

/**
 * Chặn user chưa đổi mật khẩu mặc định
 */
exports.checkPasswordChange = (req, res, next) => {
  if (req.user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      mustChangePassword: true,
      message: 'Vui lòng đổi mật khẩu mặc định trước khi tiếp tục.',
    });
  }
  next();
};

/**
 * Phân quyền theo role
 */
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' không có quyền. Cần: ${roles.join(', ')}`,
    });
  }
  next();
};
