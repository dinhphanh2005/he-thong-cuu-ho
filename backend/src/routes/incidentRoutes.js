const express = require('express');
const router = express.Router();

const {
  createIncident,
  getAllIncidents,
  getIncidentById,
  trackIncidentByCode,
  getMyIncidents,
  getActiveRescueIncident,
  updateIncidentStatus,
  refuseIncident,
  triggerSOS,
  cancelIncident,
} = require('../controllers/incidentController');

const { protect, checkPasswordChange, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { sosLimiter } = require('../middleware/rateLimiter');
const {
  createIncidentRules,
  updateStatusRules,
  sosRules,
  validate,
} = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Quản lý sự cố giao thông
 */

// ── PUBLIC ──────────────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/incidents/track/{code}:
 *   get:
 *     summary: Theo dõi sự cố bằng mã tracking (không cần đăng nhập)
 *     tags: [Incidents]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         example: INC-1744000000000-1234
 *     responses:
 *       200:
 *         description: Thông tin sự cố
 *       404:
 *         description: Không tìm thấy sự cố
 */
router.get('/track/:code', trackIncidentByCode);

// ── PRIVATE ──────────────────────────────────────────────────────
router.use(protect, checkPasswordChange);

/**
 * @swagger
 * /api/v1/incidents/my:
 *   get:
 *     summary: Danh sách sự cố của Citizen đang đăng nhập
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách sự cố của tôi
 */
router.get('/my', authorize('CITIZEN'), getMyIncidents);

/**
 * @swagger
 * /api/v1/incidents/rescue/active:
 *   get:
 *     summary: Sự cố đang được phân công cho đội Rescue đang đăng nhập
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sự cố đang xử lý (null nếu không có)
 */
router.get('/rescue/active', authorize('RESCUE'), getActiveRescueIncident);
router.patch('/:id/refuse', authorize('RESCUE'), refuseIncident);

/**
 * @swagger
 * /api/v1/incidents/sos:
 *   post:
 *     summary: Gửi tín hiệu SOS khẩn cấp 1 chạm
 *     tags: [Incidents]
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
 *                 example: [105.8412, 21.0245]
 *               description:
 *                 type: string
 *                 example: Cần cứu thương gấp
 *     responses:
 *       201:
 *         description: SOS gửi thành công, severity CRITICAL
 */
router.post('/sos', sosLimiter, authorize('CITIZEN'), sosRules, validate, triggerSOS);

/**
 * @swagger
 * /api/v1/incidents:
 *   post:
 *     summary: Tạo sự cố mới
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [type, severity, coordinates, description]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [ACCIDENT, BREAKDOWN, FLOOD, FIRE, OTHER]
 *                 example: ACCIDENT
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 example: HIGH
 *               coordinates:
 *                 type: string
 *                 description: JSON string [lng, lat]
 *                 example: "[105.8412, 21.0245]"
 *               address:
 *                 type: string
 *                 example: Ngã tư Hàng Bài - Đinh Tiên Hoàng
 *               description:
 *                 type: string
 *                 example: Tai nạn nghiêm trọng, cần cứu thương
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Sự cố tạo thành công, auto-assign đội cứu hộ nếu có
 *   get:
 *     summary: Danh sách sự cố (Dispatcher/Admin)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ASSIGNED, ARRIVED, PROCESSING, COMPLETED, CANCELLED, HANDLED_BY_EXTERNAL]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ACCIDENT, BREAKDOWN, FLOOD, FIRE, OTHER]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
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
 *         description: Danh sách sự cố có phân trang
 */
router.post('/', upload.array('photos', 5), authorize('CITIZEN', 'DISPATCHER'), createIncidentRules, validate, createIncident);
router.get('/', authorize('DISPATCHER', 'ADMIN'), getAllIncidents);

/**
 * @swagger
 * /api/v1/incidents/{id}:
 *   get:
 *     summary: Chi tiết một sự cố
 *     tags: [Incidents]
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
 *         description: Chi tiết sự cố + timeline
 *       403:
 *         description: Không có quyền xem sự cố này
 *       404:
 *         description: Không tìm thấy sự cố
 */
router.get('/:id', getIncidentById);

/**
 * @swagger
 * /api/v1/incidents/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái sự cố
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [PENDING, ASSIGNED, ARRIVED, PROCESSING, COMPLETED, CANCELLED, HANDLED_BY_EXTERNAL]
 *                 example: ARRIVED
 *               note:
 *                 type: string
 *                 example: Đội đang trên đường đến
 *               estimatedArrivalMinutes:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/:id/status', authorize('RESCUE', 'DISPATCHER', 'ADMIN'), updateStatusRules, validate, updateIncidentStatus);

/**
 * @swagger
 * /api/v1/incidents/{id}/cancel:
 *   patch:
 *     summary: Hủy sự cố (Dispatcher/Admin)
 *     tags: [Incidents]
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
 *               reason:
 *                 type: string
 *                 example: Người dân báo nhầm
 *     responses:
 *       200:
 *         description: Hủy thành công
 */
router.patch('/:id/cancel', authorize('DISPATCHER', 'ADMIN'), cancelIncident);

module.exports = router;
