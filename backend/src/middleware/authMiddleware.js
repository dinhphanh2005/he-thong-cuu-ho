const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Express v5: jwt.verify throws nếu token không hợp lệ
 * → Express v5 tự forward tới error middleware, không cần try/catch
 */
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập. Vui lòng đăng nhập!',
    });
  }

  const token = authHeader.split(' ')[1];

  // Express v5: nếu jwt.verify throw → tự vào errorHandler
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).populate('rescueTeam', 'name code zone status');

  if (!user) {
    return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa.' });
  }

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
