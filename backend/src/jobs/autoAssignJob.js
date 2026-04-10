const Bull = require('bull');
const Incident = require('../models/Incident');
const { autoAssignTeam } = require('../services/assignmentService');
const { sendNotification } = require('../services/notificationService');
const User = require('../models/User');
const logger = require('../utils/logger');

const QUEUE_NAME = 'incident-auto-assign';
const RETRY_TIMEOUT_MS = 2 * 60 * 1000; // 2 phút thử lại
const ESCALATE_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút leo thang (PENDING quá lâu)

let assignQueue = null;

/**
 * Khởi tạo Bull Queue
 * @param {SocketIO.Server} io
 */
const initAutoAssignQueue = (io) => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  assignQueue = new Bull(QUEUE_NAME, redisUrl, {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 }, // 30s, 60s, 120s
    },
  });

  // Worker: xử lý job
  assignQueue.process(async (job) => {
    const { incidentId } = job.data;

    const incident = await Incident.findById(incidentId);
    if (!incident) return { message: 'Incident không tồn tại' };

    // Đã được assign rồi → skip
    if (incident.status !== 'PENDING') {
      return { message: `Incident đã ở trạng thái ${incident.status}, skip` };
    }

    const team = await autoAssignTeam(incident, io);
    if (team) {
      return { message: `Đã assign cho ${team.name}` };
    }

    // Không tìm được đội → leo thang nếu quá 5 phút
    const pendingTimeMs = Date.now() - incident.createdAt.getTime();
    if (pendingTimeMs > ESCALATE_TIMEOUT_MS) {
      incident.isEscalated = true;
      incident.timeline.push({
        status: 'PENDING',
        updatedBy: null,
        note: `Tự động leo thang: không tìm được đội cứu hộ sau ${Math.round(pendingTimeMs / 60000)} phút`,
      });
      await incident.save();

      // Thông báo tất cả dispatcher về sự cố chưa được xử lý
      const dispatchers = await User.find({ role: { $in: ['DISPATCHER', 'ADMIN'] }, isActive: true }).select('_id');
      await sendNotification({
        recipientIds: dispatchers.map((d) => d._id),
        type: 'SYSTEM',
        title: '⚠️ Sự cố cần xử lý thủ công',
        body: `Sự cố ${incident.code} chưa tìm được đội cứu hộ sau ${Math.round(pendingTimeMs / 60000)} phút`,
        incidentId: incident._id,
      });

      if (io) {
        io.to('dispatchers').emit('incident:escalated', {
          incidentId: incident._id,
          code: incident.code,
          message: 'Cần phân công thủ công!',
        });
      }

      throw new Error('Không tìm được đội — đã leo thang');
    }

    throw new Error('Không tìm được đội — sẽ thử lại');
  });

  assignQueue.on('completed', (job, result) => {
    logger.info(`[Queue] Job ${job.id} hoàn thành: ${result?.message}`);
  });

  assignQueue.on('failed', (job, err) => {
    logger.warn(`[Queue] Job ${job.id} thất bại (attempt ${job.attemptsMade}): ${err.message}`);
  });

  logger.info('✅ Bull Queue auto-assign đã khởi tạo');
  return assignQueue;
};

/**
 * Thêm incident mới vào queue để auto-assign
 * @param {string} incidentId
 * @param {number} delayMs - Delay trước khi xử lý (ms)
 */
const addToAssignQueue = async (incidentId, delayMs = 0) => {
  if (!assignQueue) {
    logger.warn('Queue chưa được khởi tạo');
    return;
  }
  await assignQueue.add({ incidentId }, { delay: delayMs });
};

/**
 * Thêm job retry sau khoảng thời gian (khi không tìm được đội ngay)
 */
const scheduleRetry = async (incidentId) => {
  await addToAssignQueue(incidentId, RETRY_TIMEOUT_MS);
};

module.exports = { initAutoAssignQueue, addToAssignQueue, scheduleRetry };
