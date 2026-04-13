const { admin } = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const https = require('https');

// ─── Expo Push API Helper ────────────────────────────────────────────────────

/**
 * Send notifications via Expo Push API (works for Expo Go / managed workflow)
 * Tokens look like: ExponentPushToken[xxx]
 */
const sendExpoPush = (messages) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(messages);
    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const results = parsed.data || [];
          let successCount = 0;
          let failCount = 0;
          results.forEach(r => {
            if (r.status === 'ok') successCount++;
            else failCount++;
          });
          logger.info(`[Expo Push] ${successCount}/${messages.length} gửi thành công, ${failCount} thất bại`);
          resolve(parsed);
        } catch (e) {
          resolve({});
        }
      });
    });

    req.on('error', (err) => {
      logger.warn(`[Expo Push] Lỗi HTTP: ${err.message}`);
      resolve({}); // don't crash on push failure
    });

    req.write(body);
    req.end();
  });
};

// ─── Main sendNotification ───────────────────────────────────────────────────

/**
 * Send push notification + save to DB for given recipient IDs
 * Supports both Expo Push Tokens (ExponentPushToken[...]) and FCM tokens
 */
const sendNotification = async ({ recipientIds, type, title, body, data = {}, incidentId = null }) => {
  const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds];

  try {
    // Get all users with a push token
    const users = await User.find({
      _id: { $in: ids },
      isActive: true,
      fcmToken: { $ne: null },
    }).select('fcmToken');

    const expoTokens = [];
    const fcmTokens = [];

    users.forEach(u => {
      if (!u.fcmToken) return;
      if (u.fcmToken.startsWith('ExponentPushToken')) {
        expoTokens.push(u.fcmToken);
      } else {
        fcmTokens.push(u.fcmToken);
      }
    });

    // Save in-app notification to DB
    const notifDocs = ids.map(recipientId => ({
      recipient: recipientId,
      type,
      title,
      body,
      data,
      incident: incidentId,
    }));
    await Notification.insertMany(notifDocs, { ordered: false });

    // Send via Expo Push API
    if (expoTokens.length > 0) {
      const messages = expoTokens.map(to => ({
        to,
        title,
        body,
        sound: 'default',
        data: {
          type,
          incidentId: incidentId?.toString() || '',
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
        },
        priority: type === 'SOS_ALERT' ? 'high' : 'default',
        channelId: 'default',
      }));
      await sendExpoPush(messages);
    }

    // Send via Firebase FCM (native tokens)
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
      logger.info(`[FCM] ${response.successCount}/${fcmTokens.length} thành công`);

      // Clean expired FCM tokens
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

    if (expoTokens.length === 0 && fcmTokens.length === 0) {
      logger.debug(`[Push] Không có push token cho ${ids.length} người dùng (in-app notification đã lưu)`);
    }
  } catch (err) {
    logger.error(`[Push] Thất bại: ${err.message}`);
    // Don't throw — notification failure must not crash business logic
  }
};

// ─── Convenience helpers ─────────────────────────────────────────────────────

/**
 * Gửi cảnh báo SOS tới tất cả DISPATCHER và RESCUE
 */
const sendSOSAlert = async (incident) => {
  const recipients = await User.find({
    role: { $in: ['DISPATCHER', 'RESCUE'] },
    isActive: true,
  }).select('_id');
  const recipientIds = recipients.map(u => u._id);

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
 * Thông báo cho Citizen khi đội được phân công
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
 * Thông báo cho Citizen khi hoàn thành
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
 * Thông báo cho đội cứu hộ khi được giao sự cố
 */
const notifyRescueTeamAssigned = async (incident, team) => {
  const memberIds = team.members?.map(m => m.userId).filter(Boolean) || [];
  if (memberIds.length === 0) return;
  await sendNotification({
    recipientIds: memberIds,
    type: 'ASSIGNED_TO_YOU',
    title: '📍 Đội bạn được phân công sự cố mới',
    body: `Sự cố ${incident.code} tại ${incident.location?.address || 'Vị trí GPS'}`,
    data: { incidentCode: incident.code, severity: incident.severity || 'NORMAL' },
    incidentId: incident._id,
  });
};

/**
 * Thông báo cho Dispatcher khi đội từ chối
 */
const notifyDispatcherRefused = async (incident, teamName) => {
  const dispatchers = await User.find({ role: 'DISPATCHER', isActive: true }).select('_id');
  if (dispatchers.length === 0) return;
  await sendNotification({
    recipientIds: dispatchers.map(d => d._id),
    type: 'TEAM_REFUSED',
    title: '⚠️ Đội từ chối nhiệm vụ',
    body: `Đội ${teamName} đã từ chối sự cố ${incident.code}. Hệ thống đang tìm đội khác...`,
    incidentId: incident._id,
  });
};

/**
 * MOCK: Gửi OTP qua Email
 */
const sendOTPEmail = async (email, otp) => {
  logger.info(`[MOCK EMAIL] Gửi tới: ${email} | Nội dung: Mã xác thực OTP của bạn là: ${otp}`);
  // Trong thực tế sẽ gọi nodemailer hoặc SendGrid
  return true;
};

/**
 * MOCK: Gửi OTP qua SMS
 */
const sendOTPSMS = async (phone, otp) => {
  logger.info(`[MOCK SMS] Gửi tới: ${phone} | Nội dung: [CuuHoGiaoThong] Ma OTP cua ban la ${otp}. Hieu luc 5 phut.`);
  // Trong thực tế sẽ gọi Twilio, Infobip hoặc eSMS
  return true;
};

module.exports = {
  sendNotification,
  sendSOSAlert,
  notifyCitizenAssigned,
  notifyCitizenCompleted,
  notifyRescueTeamAssigned,
  notifyDispatcherRefused,
  sendOTPEmail,
  sendOTPSMS,
};
