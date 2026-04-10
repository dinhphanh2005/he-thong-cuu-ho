const { body, param, query, validationResult } = require('express-validator');

/**
 * Helper: chạy validationResult và trả 422 nếu có lỗi
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ==================== AUTH ====================
exports.registerRules = [
  body('name').trim().notEmpty().withMessage('Họ tên không được rỗng'),
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('phone')
    .matches(/^0[35789][0-9]{8}$/)
    .withMessage('SĐT Việt Nam không hợp lệ'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu tối thiểu 6 ký tự'),
];

exports.loginRules = [
  body('loginId').notEmpty().withMessage('Vui lòng nhập email hoặc SĐT'),
  body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu'),
];

exports.changePasswordRules = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới tối thiểu 6 ký tự'),
];

// ==================== INCIDENT ====================
exports.createIncidentRules = [
  body('type')
    .isIn(['ACCIDENT', 'BREAKDOWN', 'FLOOD', 'FIRE', 'OTHER'])
    .withMessage('Loại sự cố không hợp lệ'),
  body('severity')
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Mức độ nghiêm trọng không hợp lệ'),
  body('description').trim().notEmpty().withMessage('Mô tả sự cố không được rỗng'),
  body('coordinates')
    .notEmpty()
    .withMessage('Tọa độ không được rỗng')
    .customSanitizer((val) => (typeof val === 'string' ? JSON.parse(val) : val))
    .isArray({ min: 2, max: 2 })
    .withMessage('Tọa độ phải là mảng [lng, lat]'),
];

exports.updateStatusRules = [
  body('status')
    .isIn(['PENDING', 'ASSIGNED', 'ARRIVED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL'])
    .withMessage('Trạng thái không hợp lệ'),
];

exports.sosRules = [
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Tọa độ SOS không hợp lệ'),
];

// ==================== RESCUE TEAM ====================
exports.createTeamRules = [
  body('name').trim().notEmpty().withMessage('Tên đội không được rỗng'),
  body('code').trim().notEmpty().withMessage('Mã đội không được rỗng'),
  body('type')
    .isIn(['AMBULANCE', 'TOW_TRUCK', 'FIRE', 'POLICE', 'MULTI'])
    .withMessage('Loại đội không hợp lệ'),
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Tọa độ không hợp lệ'),
];

exports.updateLocationRules = [
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Tọa độ [lng, lat] không hợp lệ'),
];

// ==================== ADMIN ====================
exports.createDispatcherRules = [
  body('name').trim().notEmpty().withMessage('Họ tên không được rỗng'),
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('phone')
    .matches(/^0[35789][0-9]{8}$/)
    .withMessage('SĐT không hợp lệ'),
];

exports.createRescueMemberRules = [
  ...exports.createDispatcherRules,
  body('teamId').isMongoId().withMessage('teamId không hợp lệ'),
];

// ==================== CHAT ====================
exports.sendMessageRules = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Nội dung tin nhắn không được rỗng')
    .isLength({ max: 1000 })
    .withMessage('Tin nhắn tối đa 1000 ký tự'),
  param('incidentId').isMongoId().withMessage('incidentId không hợp lệ'),
];
