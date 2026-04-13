const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Skip rate limiting for localhost (development / simulator testing)
 */
const skipLocalhost = (req) => {
  return false; // TEMPORARILY DISABLED FOR TC-12 TEST
  // const ip = req.ip || req.connection?.remoteAddress || '';
  // return isDev || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.');
};

/**
 * Rate limiter mặc định cho mọi API
 * Dev: skip for localhost; Prod: 500 req / 15 min
 */
exports.generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalhost,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter nghiêm hơn cho auth endpoints
 * Dev: skip; Prod: 30 lần / 15 phút
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: skipLocalhost,
  message: {
    success: false,
    message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter cho SOS (dev: skip; prod: 3 lần per 30 giây)
 */
exports.sosLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: isDev ? 100 : 3,
  skip: skipLocalhost,
  message: {
    success: false,
    message: 'Bạn đã gửi SOS quá nhiều lần. Vui lòng đợi 30 giây.',
  },
});
