const express = require('express');
const router = express.Router();
const { reverseGeocode, searchPlace } = require('../services/geocodingService');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Geo
 *   description: Geocoding - chuyển đổi tọa độ ↔ địa chỉ
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/geo/reverse:
 *   get:
 *     summary: Lấy địa chỉ từ tọa độ GPS (Reverse Geocoding)
 *     tags: [Geo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         example: 21.0245
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         example: 105.8412
 *     responses:
 *       200:
 *         description: Địa chỉ tương ứng với tọa độ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "Phố Hàng Bài, Hoàn Kiếm, Hà Nội"
 *       400:
 *         description: Thiếu tham số lat hoặc lng
 */
router.get('/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lat và lng' });
  }
  const address = await reverseGeocode(parseFloat(lat), parseFloat(lng));
  res.status(200).json({ success: true, data: { address } });
});

/**
 * @swagger
 * /api/v1/geo/search:
 *   get:
 *     summary: Tìm kiếm địa điểm theo tên (Forward Geocoding)
 *     tags: [Geo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: Hồ Hoàn Kiếm
 *     responses:
 *       200:
 *         description: Danh sách địa điểm tìm được
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       displayName:
 *                         type: string
 *                       lat:
 *                         type: number
 *                       lng:
 *                         type: number
 *       400:
 *         description: Thiếu tham số q
 */
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp từ khóa q' });
  const results = await searchPlace(q);
  res.status(200).json({ success: true, data: results });
});

module.exports = router;
