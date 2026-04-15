const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).populate('incident', 'code type status').sort('-createdAt').skip(skip).limit(parseInt(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);
  res.status(200).json({ success: true, unreadCount, count: notifications.length, total, data: notifications });
};

exports.markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { isRead: true }, { returnDocument: 'after' });
  if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
  res.status(200).json({ success: true, data: notification });
};

exports.markAllAsRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  res.status(200).json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
};

exports.cleanupOldNotifications = async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await Notification.deleteMany({ recipient: req.user._id, createdAt: { $lt: thirtyDaysAgo }, isRead: true });
  res.status(200).json({ success: true, message: `Đã xóa ${result.deletedCount} thông báo cũ` });
};
