// ============================================================
// reportRoutes.js
// ============================================================
const express = require('express');
const reportRouter = express.Router();
const { getSummary, getHeatmap, getTimeline, getTeamPerformance } = require('../controllers/reportController');
const { protect, checkPasswordChange, authorize } = require('../middleware/authMiddleware');
const { cacheRoute } = require('../middleware/cacheMiddleware');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Báo cáo thống kê (Dispatcher/Admin)
 */

reportRouter.use(protect, checkPasswordChange, authorize('DISPATCHER', 'ADMIN'));

/**
 * @swagger
 * /api/v1/reports/summary:
 *   get:
 *     summary: Thống kê tổng hợp
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         example: "2026-01-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Stats theo status, type, severity + avgResponseTime
 */
reportRouter.get('/summary', cacheRoute(120), getSummary);

/**
 * @swagger
 * /api/v1/reports/heatmap:
 *   get:
 *     summary: Dữ liệu heatmap điểm nóng tai nạn
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Mảng [{lat, lng, intensity, type, severity}] cho Leaflet.heat
 */
reportRouter.get('/heatmap', cacheRoute(120), getHeatmap);

/**
 * @swagger
 * /api/v1/reports/timeline:
 *   get:
 *     summary: Thống kê sự cố theo timeline (biểu đồ đường)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, month, hour]
 *           default: day
 *     responses:
 *       200:
 *         description: Mảng [{_id, total, completed, sos}] theo ngày/tháng
 */
reportRouter.get('/timeline', cacheRoute(120), getTimeline);

/**
 * @swagger
 * /api/v1/reports/team-performance:
 *   get:
 *     summary: Hiệu suất các đội cứu hộ (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đội sắp xếp theo totalCompleted
 */
reportRouter.get('/team-performance', authorize('ADMIN'), cacheRoute(120), getTeamPerformance);

module.exports = reportRouter;
