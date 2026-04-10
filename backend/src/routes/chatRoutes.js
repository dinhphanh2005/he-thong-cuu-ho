const express = require('express');
const router = express.Router();

const { getMessages, sendMessage } = require('../controllers/chatController');
const { protect, checkPasswordChange } = require('../middleware/authMiddleware');
const { sendMessageRules, validate } = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat theo kênh sự cố
 */

router.use(protect, checkPasswordChange);

/**
 * @swagger
 * /api/v1/chat/{incidentId}/messages:
 *   get:
 *     summary: Lịch sử chat của một sự cố
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn (cũ → mới)
 *       403:
 *         description: Không có quyền xem chat này
 *   post:
 *     summary: Gửi tin nhắn trong kênh sự cố
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Đội đang đến, khoảng 5 phút nữa
 *     responses:
 *       201:
 *         description: Tin nhắn gửi thành công + emit Socket.IO
 *       403:
 *         description: Không có quyền gửi tin nhắn
 */
router.get('/:incidentId/messages', getMessages);
router.post('/:incidentId/messages', sendMessageRules, validate, sendMessage);

module.exports = router;
