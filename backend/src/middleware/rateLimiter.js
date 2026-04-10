const rateLimit = require('express-rate-limit');

/**
 * Rate limiter mặc định cho mọi API
 */
exports.generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 phút
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter nghiêm hơn cho auth endpoints
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Tối đa 20 lần đăng nhập/đăng ký per 15 phút
  message: {
    success: false,
    message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter cho SOS (1 lần per 30 giây để tránh spam)
 */
exports.sosLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Bạn đã gửi SOS quá nhiều lần. Vui lòng đợi 30 giây.',
  },
});
