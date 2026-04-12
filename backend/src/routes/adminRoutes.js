const express = require('express');
const router = express.Router();

const {
  createDispatcher,
  getAllDispatchers,
  createRescueTeam,
  updateRescueTeam,
  deleteRescueTeam,
  toggleSuspendTeam,
  createRescueMember,
  getAllUsers,
  toggleUserActive,
  resetUserPassword,
  triggerDailyReport,
  getDashboard,
  getSystemConfig,
  updateSystemConfig,
} = require('../controllers/adminController');

const { protect, checkPasswordChange, authorize } = require('../middleware/authMiddleware');
const {
  createDispatcherRules,
  createRescueMemberRules,
  createTeamRules,
  validate,
} = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Quản lý hệ thống (chỉ ADMIN)
 */

router.use(protect, checkPasswordChange, authorize('ADMIN'));

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Thống kê tổng quan hệ thống
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats tổng quan
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /api/v1/admin/dispatchers:
 *   post:
 *     summary: Tạo tài khoản Dispatcher
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Trần Dispatcher
 *               email:
 *                 type: string
 *                 example: dispatcher@test.com
 *               phone:
 *                 type: string
 *                 example: "0902345678"
 *     responses:
 *       201:
 *         description: Tạo thành công, trả về defaultPassword
 *       400:
 *         description: Email hoặc SĐT đã tồn tại
 *   get:
 *     summary: Danh sách tất cả Dispatcher
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách Dispatcher
 */
router.post('/dispatchers', createDispatcherRules, validate, createDispatcher);
router.get('/dispatchers', getAllDispatchers);

/**
 * @swagger
 * /api/v1/admin/rescue-teams:
 *   post:
 *     summary: Tạo đội cứu hộ mới
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code, type, coordinates]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Đội Cứu Hộ Hà Nội 01
 *               code:
 *                 type: string
 *                 example: RESCUE-HN-01
 *               type:
 *                 type: string
 *                 enum: [AMBULANCE, TOW_TRUCK, FIRE, POLICE, MULTI]
 *                 example: AMBULANCE
 *               zone:
 *                 type: string
 *                 example: Hoàn Kiếm
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [105.8412, 21.0245]
 *     responses:
 *       201:
 *         description: Tạo đội thành công
 */
router.post('/rescue-teams', createTeamRules, validate, createRescueTeam);

/**
 * @swagger
 * /api/v1/admin/rescue-teams/{id}:
 *   put:
 *     summary: Cập nhật thông tin đội cứu hộ
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               zone:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [AMBULANCE, TOW_TRUCK, FIRE, POLICE, MULTI]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy đội
 *   delete:
 *     summary: Xóa đội cứu hộ
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Đội đang xử lý sự cố, không thể xóa
 */
router.put('/rescue-teams/:id', updateRescueTeam);
router.delete('/rescue-teams/:id', deleteRescueTeam);
router.patch('/rescue-teams/:id/toggle-suspend', toggleSuspendTeam);

/**
 * @swagger
 * /api/v1/admin/rescue-members:
 *   post:
 *     summary: Tạo tài khoản nhân viên cứu hộ và gắn vào đội
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, teamId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nguyễn Cứu Hộ
 *               email:
 *                 type: string
 *                 example: rescue@test.com
 *               phone:
 *                 type: string
 *                 example: "0903456789"
 *               teamId:
 *                 type: string
 *                 example: 6614f1234abc...
 *               memberRole:
 *                 type: string
 *                 enum: [LEADER, DRIVER, MEDIC, MEMBER]
 *                 example: LEADER
 *     responses:
 *       201:
 *         description: Tạo thành công, trả về defaultPassword
 */
router.post('/rescue-members', createRescueMemberRules, validate, createRescueMember);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Danh sách tất cả users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, DISPATCHER, RESCUE, CITIZEN]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Danh sách users
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}/toggle-active:
 *   patch:
 *     summary: Kích hoạt hoặc khóa tài khoản user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 */
router.patch('/users/:id/toggle-active', toggleUserActive);

/**
 * @swagger
 * /api/v1/admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset mật khẩu về mặc định
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reset thành công, trả về defaultPassword
 */
router.post('/users/:id/reset-password', resetUserPassword);

/**
 * @swagger
 * /api/v1/admin/reports/trigger:
 *   post:
 *     summary: Trigger báo cáo ngày thủ công
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetDate:
 *                 type: string
 *                 example: "2026-04-07"
 *     responses:
 *       200:
 *         description: Đã đưa vào hàng đợi
 */
router.post('/reports/trigger', triggerDailyReport);

/**
 * @swagger
 * /api/v1/admin/config:
 *   get:
 *     summary: Lấy cấu hình hệ thống
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *   patch:
 *     summary: Cập nhật cấu hình hệ thống
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/config', getSystemConfig);
router.patch('/config', updateSystemConfig);

module.exports = router;
