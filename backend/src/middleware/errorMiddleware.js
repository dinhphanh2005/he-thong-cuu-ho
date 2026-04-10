const logger = require('../utils/logger');

/**
 * Express v5: async errors trong route handlers tự động forward vào đây
 * Không cần next(err) trong controllers nữa
 *
 * Phải có đủ 4 params để Express nhận diện là error middleware
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi máy chủ nội bộ';

  // Mongoose: ID không đúng định dạng ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Dữ liệu không hợp lệ cho trường ${err.path}`;
  }

  // Mongoose: Trùng field unique
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode = 400;
    message = `'${err.keyValue[field]}' cho trường '${field}' đã tồn tại`;
  }

  // Mongoose: Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join('. ');
  }

  // JWT — Express v5 tự bắt lỗi từ jwt.verify() trong middleware
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token không hợp lệ';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token đã hết hạn. Vui lòng đăng nhập lại.';
  }

  // Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File quá lớn. Tối đa 5MB mỗi ảnh.';
  }

  // Log lỗi server-side
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${message}`, { stack: err.stack });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Không tìm thấy: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
