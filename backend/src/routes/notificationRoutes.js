const express = require('express');
const router = express.Router();

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  cleanupOldNotifications,
} = require('../controllers/notificationController');

const { protect, checkPasswordChange } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Thông báo trong app
 */

router.use(protect, checkPasswordChange);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Danh sách thông báo của user đang đăng nhập
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         example: true
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
 *         description: Danh sách thông báo + unreadCount
 */
router.get('/', getMyNotifications);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã đánh dấu tất cả
 */
router.patch('/read-all', markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu một thông báo đã đọc
 *     tags: [Notifications]
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
 *         description: Đã đánh dấu đã đọc
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.patch('/:id/read', markAsRead);

/**
 * @swagger
 * /api/v1/notifications/cleanup:
 *   delete:
 *     summary: Xóa thông báo cũ hơn 30 ngày đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Số thông báo đã xóa
 */
router.delete('/cleanup', cleanupOldNotifications);

module.exports = router;
