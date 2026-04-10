const express = require('express');
const router = express.Router();

const {
  registerCitizen,
  login,
  refreshToken,
  getMe,
  changePassword,
  logout,
  updateFcmToken,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerRules,
  loginRules,
  changePasswordRules,
  validate,
} = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Đăng ký, đăng nhập, quản lý token
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản Citizen
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Email hoặc SĐT đã tồn tại
 */
router.post('/register', authLimiter, registerRules, validate, registerCitizen);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Đăng nhập (mọi role)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loginId, password]
 *             properties:
 *               loginId:
 *                 type: string
 *                 description: Email hoặc số điện thoại
 *                 example: user@gmail.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về accessToken + refreshToken
 *       401:
 *         description: Thông tin đăng nhập không chính xác
 *       403:
 *         description: Tài khoản đã bị khóa
 */
router.post('/login', authLimiter, loginRules, validate, login);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Lấy access token mới bằng refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trả về accessToken + refreshToken mới
 *       401:
 *         description: Refresh token không hợp lệ hoặc hết hạn
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Lấy thông tin user đang đăng nhập
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user hiện tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/logout', protect, logout);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu mặc định (lần đầu đăng nhập)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newPass123"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công, trả về token mới
 *       400:
 *         description: Mật khẩu không hợp lệ
 */
router.post('/change-password', protect, changePasswordRules, validate, changePassword);

/**
 * @swagger
 * /api/v1/auth/fcm-token:
 *   patch:
 *     summary: Cập nhật FCM token cho push notification
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 example: "dGhpcyBpcyBhIHRva2Vu..."
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/fcm-token', protect, updateFcmToken);

// ================================================================
// ⚠️  CHỈ DÙNG LÚC DEV — tự động bị tắt khi NODE_ENV=production
// ================================================================
if (process.env.NODE_ENV !== 'production') {
  /**
   * @swagger
   * /api/v1/auth/dev/create-admin:
   *   post:
   *     summary: "[DEV ONLY] Tạo tài khoản Admin mặc định"
   *     tags: [Auth]
   *     responses:
   *       201:
   *         description: Admin tạo thành công
   *       400:
   *         description: Admin đã tồn tại
   */
  router.post('/dev/create-admin', async (req, res) => {
    const User = require('../models/User');
    const existing = await User.findOne({ email: 'admin@cuuho.vn' });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Admin đã tồn tại. Hãy login bằng email: admin@cuuho.vn / pass: 123456',
      });
    }
    const user = await User.create({
      name: 'Super Admin',
      email: 'admin@cuuho.vn',
      phone: '0909999999',
      passwordHash: '123456',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    });
    res.status(201).json({
      success: true,
      message: 'Admin tạo thành công!',
      data: { email: user.email, password: '123456', role: user.role },
    });
  });
}

module.exports = router;
