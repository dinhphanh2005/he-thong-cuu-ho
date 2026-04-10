const { admin } = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Gửi push notification và lưu vào DB
 * @param {Object} opts
 * @param {string|string[]} opts.recipientIds - User ID hoặc mảng User IDs
 * @param {string} opts.type - Loại notification
 * @param {string} opts.title - Tiêu đề
 * @param {string} opts.body - Nội dung
 * @param {Object} [opts.data] - Extra data
 * @param {string} [opts.incidentId] - Incident liên quan
 */
const sendNotification = async ({ recipientIds, type, title, body, data = {}, incidentId = null }) => {
  const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds];

  try {
    // Lấy FCM tokens của các recipient
    const users = await User.find({
      _id: { $in: ids },
      isActive: true,
      fcmToken: { $ne: null },
    }).select('fcmToken');

    const fcmTokens = users.map((u) => u.fcmToken).filter(Boolean);

    // Ghi vào DB (in-app notification) song song với FCM
    const notifDocs = ids.map((recipientId) => ({
      recipient: recipientId,
      type,
      title,
      body,
      data,
      incident: incidentId,
    }));
    await Notification.insertMany(notifDocs, { ordered: false });

    // Gửi FCM nếu có token và Firebase đã init
    if (fcmTokens.length > 0 && admin?.messaging) {
      const message = {
        notification: { title, body },
        data: {
          type,
          incidentId: incidentId?.toString() || '',
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
        },
        tokens: fcmTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(`FCM: ${response.successCount}/${fcmTokens.length} thành công`);

      // Dọn FCM token hết hạn
      const expiredTokens = [];
      response.responses.forEach((r, idx) => {
        if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
          expiredTokens.push(fcmTokens[idx]);
        }
      });
      if (expiredTokens.length > 0) {
        await User.updateMany(
          { fcmToken: { $in: expiredTokens } },
          { $set: { fcmToken: null } }
        );
      }
    }
  } catch (err) {
    logger.error(`Notification thất bại: ${err.message}`);
    // Không throw — notification thất bại không nên làm crash business logic
  }
};

/**
 * Gửi thông báo SOS tới tất cả DISPATCHER và RESCUE trong zone
 */
const sendSOSAlert = async (incident, zone = null) => {
  const filter = { role: { $in: ['DISPATCHER', 'RESCUE'] }, isActive: true };
  const recipients = await User.find(filter).select('_id');
  const recipientIds = recipients.map((u) => u._id);

  await sendNotification({
    recipientIds,
    type: 'SOS_ALERT',
    title: '🚨 CẢNH BÁO SOS KHẨN CẤP!',
    body: `Có tín hiệu SOS tại: ${incident.location?.address || 'Chưa xác định địa chỉ'}`,
    data: { incidentCode: incident.code, severity: 'CRITICAL' },
    incidentId: incident._id,
  });
};

/**
 * Gửi thông báo khi incident được phân công cho Citizen
 */
const notifyCitizenAssigned = async (incident, teamName) => {
  if (!incident.reportedBy) return;

  await sendNotification({
    recipientIds: [incident.reportedBy],
    type: 'INCIDENT_ASSIGNED',
    title: '✅ Đội cứu hộ đã được điều phối',
    body: `Đội ${teamName} đang trên đường đến hỗ trợ bạn (Mã: ${incident.code})`,
    incidentId: incident._id,
  });
};

/**
 * Gửi thông báo khi incident hoàn thành cho Citizen
 */
const notifyCitizenCompleted = async (incident) => {
  if (!incident.reportedBy) return;

  await sendNotification({
    recipientIds: [incident.reportedBy],
    type: 'INCIDENT_COMPLETED',
    title: '🎉 Sự cố đã được xử lý xong',
    body: `Sự cố ${incident.code} đã được xử lý hoàn tất. Cảm ơn bạn đã tin tưởng hệ thống!`,
    incidentId: incident._id,
  });
};

/**
 * Gửi thông báo cho đội cứu hộ khi được phân công
 */
const notifyRescueTeamAssigned = async (incident, team) => {
  const memberIds = team.members?.map((m) => m.userId).filter(Boolean) || [];
  if (memberIds.length === 0) return;

  await sendNotification({
    recipientIds: memberIds,
    type: 'ASSIGNED_TO_YOU',
    title: '📍 Đội bạn được phân công sự cố mới',
    body: `Sự cố ${incident.code} — ${incident.type} tại ${incident.location?.address || 'Vị trí GPS'}`,
    data: { incidentCode: incident.code, severity: incident.severity },
    incidentId: incident._id,
  });
};

module.exports = {
  sendNotification,
  sendSOSAlert,
  notifyCitizenAssigned,
  notifyCitizenCompleted,
  notifyRescueTeamAssigned,
};
