const Bull = require('bull');
const nodemailer = require('nodemailer');
const Incident = require('../models/Incident');
const RescueTeam = require('../models/RescueTeam');
const User = require('../models/User');
const logger = require('../utils/logger');

const QUEUE_NAME = 'daily-report';

let reportQueue = null;

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

/**
 * Tạo nội dung báo cáo ngày
 */
const buildDailyStats = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const filter = { createdAt: { $gte: startOfDay, $lte: endOfDay } };

  const [total, byStatus, byType, bySeverity, teamStats] = await Promise.all([
    Incident.countDocuments(filter),
    Incident.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Incident.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Incident.aggregate([{ $match: filter }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    RescueTeam.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const completedIncidents = byStatus.find((s) => s._id === 'COMPLETED')?.count || 0;
  const sosCount = await Incident.countDocuments({ ...filter, code: /^SOS-/ });

  return {
    date: date.toLocaleDateString('vi-VN'),
    total,
    completedIncidents,
    sosCount,
    byStatus,
    byType,
    bySeverity,
    teamStats,
  };
};

const buildEmailHtml = (stats) => `
<h2>📊 Báo cáo Cứu hộ Giao thông ngày ${stats.date}</h2>
<table border="1" cellpadding="8" style="border-collapse:collapse">
  <tr><td><strong>Tổng sự cố</strong></td><td>${stats.total}</td></tr>
  <tr><td><strong>Đã hoàn thành</strong></td><td>${stats.completedIncidents}</td></tr>
  <tr><td><strong>Tín hiệu SOS</strong></td><td>${stats.sosCount}</td></tr>
</table>
<h3>Theo trạng thái:</h3>
<ul>${stats.byStatus.map((s) => `<li>${s._id}: ${s.count}</li>`).join('')}</ul>
<h3>Theo loại sự cố:</h3>
<ul>${stats.byType.map((s) => `<li>${s._id}: ${s.count}</li>`).join('')}</ul>
<h3>Trạng thái đội cứu hộ hiện tại:</h3>
<ul>${stats.teamStats.map((s) => `<li>${s._id}: ${s.count} đội</li>`).join('')}</ul>
<hr><p style="color:#888">Được tạo tự động bởi hệ thống Cứu hộ Giao thông</p>
`;

/**
 * Khởi tạo queue báo cáo ngày
 */
const initDailyReportQueue = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  reportQueue = new Bull(QUEUE_NAME, redisUrl, {
    redis: { maxRetriesPerRequest: null }
  });

  reportQueue.process(async (job) => {
    const { targetDate } = job.data;
    const date = targetDate ? new Date(targetDate) : new Date();
    // Lùi về ngày hôm qua nếu không chỉ định
    if (!targetDate) date.setDate(date.getDate() - 1);

    const stats = await buildDailyStats(date);

    // Lấy danh sách admin để gửi email
    const admins = await User.find({ role: 'ADMIN', isActive: true }).select('email name');
    if (admins.length === 0) {
      logger.warn('Daily report: không có admin nào để gửi');
      return;
    }

    // Gửi email nếu SMTP đã cấu hình
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = getTransporter();
      const emailPromises = admins.map((admin) =>
        transporter.sendMail({
          from: process.env.SMTP_FROM || 'no-reply@cuuho.vn',
          to: admin.email,
          subject: `[Cứu hộ GT] Báo cáo ngày ${stats.date}`,
          html: buildEmailHtml(stats),
        })
      );
      await Promise.allSettled(emailPromises);
    }

    logger.info(`Daily report gửi xong cho ${admins.length} admin — ${stats.total} sự cố ngày ${stats.date}`);
    return stats;
  });

  // Lên lịch tự động chạy mỗi ngày lúc 23:59
  reportQueue.add(
    {},
    {
      repeat: { cron: '59 23 * * *' },
      removeOnComplete: 10,
    }
  );

  reportQueue.on('completed', (job) => {
    logger.info(`[DailyReport] Job ${job.id} hoàn thành`);
  });
  reportQueue.on('failed', (job, err) => {
    logger.error(`[DailyReport] Job ${job.id} thất bại: ${err.message}`);
  });

  logger.info('✅ Bull Queue daily-report đã khởi tạo (chạy lúc 23:59 mỗi ngày)');
  return reportQueue;
};

/**
 * Trigger báo cáo thủ công (dùng cho test hoặc Admin muốn xuất báo cáo ngay)
 */
const triggerManualReport = async (targetDate) => {
  if (!reportQueue) return null;
  return await reportQueue.add({ targetDate }, { removeOnComplete: true });
};

module.exports = { initDailyReportQueue, triggerManualReport };
