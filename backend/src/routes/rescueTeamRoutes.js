const express = require('express');
const router = express.Router();

const {
  getAllTeams,
  getTeamById,
  getMyTeam,
  updateLocation,
  updateAvailability,
  assignTeamToIncident,
  getActiveTeamsForCitizen,
} = require('../controllers/rescueTeamController');

const { protect, checkPasswordChange, authorize } = require('../middleware/authMiddleware');
const { updateLocationRules, validate } = require('../middleware/validationMiddleware');
const { cacheRoute, clearCachePattern, clearCache } = require('../middleware/cacheMiddleware');

/**
 * @swagger
 * tags:
 *   name: Rescue Teams
 *   description: Quản lý đội cứu hộ
 */

router.use(protect, checkPasswordChange);

/**
 * @swagger
 * /api/v1/rescue-teams/my-team:
 *   get:
 *     summary: Thông tin đội của Rescue đang đăng nhập
 *     tags: [Rescue Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin đội + sự cố đang xử lý
 *       404:
 *         description: Chưa được gắn với đội nào
 */
router.get('/my-team', authorize('RESCUE'), getMyTeam);

/**
 * @swagger
 * /api/v1/rescue-teams/active:
 *   get:
 *     summary: Lấy danh sách đội cứu hộ đang active (Cho tất cả user) tìm từ gần đến xa
 *     tags: [Rescue Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Danh sách tìm thấy
 *       400:
 *         description: Thiếu lat, lng
 */
router.get('/active', cacheRoute(60), getActiveTeamsForCitizen);

/**
 * @swagger
 * /api/v1/rescue-teams:
 *   get:
 *     summary: Danh sách tất cả đội cứu hộ (Dispatcher/Admin)
 *     tags: [Rescue Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, BUSY, OFFLINE]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [AMBULANCE, TOW_TRUCK, FIRE, POLICE, MULTI]
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách đội cứu hộ + vị trí GPS hiện tại
 */
router.get('/', authorize('DISPATCHER', 'ADMIN'), cacheRoute(60), getAllTeams);

/**
 * @swagger
 * /api/v1/rescue-teams/{id}:
 *   get:
 *     summary: Chi tiết một đội cứu hộ
 *     tags: [Rescue Teams]
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
 *         description: Thông tin đội + thành viên
 *       403:
 *         description: Rescue chỉ xem được đội của mình
 *       404:
 *         description: Không tìm thấy đội
 */
router.get('/:id', authorize('DISPATCHER', 'ADMIN', 'RESCUE'), getTeamById);

/**
 * @swagger
 * /api/v1/rescue-teams/location:
 *   patch:
 *     summary: Cập nhật GPS của đội (Rescue app gọi mỗi 10 giây)
 *     tags: [Rescue Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coordinates]
 *             properties:
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [105.8450, 21.0280]
 *     responses:
 *       200:
 *         description: GPS cập nhật thành công, emit socket tới Dispatcher
 */
// clearCachePattern('rescue-teams') chỉ xóa cache liên quan đến đội cứu hộ,
// không ảnh hưởng incidents hay reports — route này gọi mỗi 10 giây nên rất quan trọng
router.patch('/location', authorize('RESCUE'), updateLocationRules, validate, clearCachePattern('rescue-teams'), updateLocation);

/**
 * @swagger
 * /api/v1/rescue-teams/availability:
 *   patch:
 *     summary: Báo cáo trạng thái AVAILABLE hoặc OFFLINE
 *     tags: [Rescue Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, OFFLINE]
 *                 example: OFFLINE
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Không thể offline khi đang xử lý sự cố
 */
router.patch('/availability', authorize('RESCUE'), clearCachePattern('rescue-teams'), updateAvailability);

/**
 * @swagger
 * /api/v1/rescue-teams/{teamId}/assign/{incidentId}:
 *   patch:
 *     summary: Dispatcher phân công thủ công đội cho sự cố
 *     tags: [Rescue Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Phân công thành công
 *       400:
 *         description: Đội đang BUSY hoặc sự cố đã kết thúc
 */
// Xóa cả rescue-teams và incidents vì phân công ảnh hưởng cả hai
router.patch('/:teamId/assign/:incidentId', authorize('DISPATCHER', 'ADMIN'), clearCache(), assignTeamToIncident);

module.exports = router;
