const Bull = require('bull');
const Incident = require('../models/Incident');
const RescueTeam = require('../models/RescueTeam');
const SystemConfig = require('../models/SystemConfig');
const { autoAssignTeam } = require('../services/assignmentService');
const { recalculateTeamStatus } = require('../services/teamAvailabilityService');
const logger = require('../utils/logger');

const QUEUE_NAME = 'incident-auto-assign';
let assignQueue = null;
let globalIo = null;

/**
 * Logic chính của auto-assign (tách ra để reuse cho fallback)
 * @param {string} incidentId
 * @param {SocketIO.Server} io
 */
const processAutoAssign = async (incidentId, io) => {
  const config = await SystemConfig.getSingleton();
  const timeoutSec = config.algoSettings?.assignmentTimeoutSec || 35;

  const incident = await Incident.findById(incidentId);
  if (!incident) return { message: 'Incident không tồn tại' };

  // 1. Kiểm tra nếu đang ở trạng thái OFFERING (chờ rescue xác nhận)
  if (incident.status === 'OFFERING') {
    const now = new Date();
    if (now > incident.offerExpiresAt) {
      logger.warn(`Job: Incident ${incident.code} hết hạn offer (35s). Tự động fallback.`);
      
      const oldTeamId = incident.offeredTo;
      if (oldTeamId) {
        const alreadyRejected = (incident.rejectedTeams || []).some(
          (teamId) => teamId?.toString() === oldTeamId.toString()
        );
        if (!alreadyRejected) {
          incident.rejectedTeams.push(oldTeamId);
        }
      }

      incident.status = 'PENDING';
      incident.assignedTeam = null;
      incident.offeredTo = null;
      incident.offerExpiresAt = null;
      incident.timeline.push({
        status: 'PENDING',
        updatedBy: null,
        note: `Đề xuất hết hạn (35s) mà không có phản hồi từ đội cứu hộ.`,
      });
      await incident.save();

      // Giải phóng đội sau khi incident đã được reset để tránh tính nhầm BUSY.
      if (oldTeamId) {
        const oldTeamState = await recalculateTeamStatus(oldTeamId);
        if (io && oldTeamState?.team) {
          io.to('dispatchers').emit('rescue:status-changed', {
            teamId: oldTeamState.team._id,
            status: oldTeamState.team.status,
          });
        }
      }

      if (io) {
        io.to('dispatchers').emit('incident:offering-timeout', { incidentId: incident._id, code: incident.code });
        // Emit updated so dispatcher UI recalculates incident list status
        const { emitIncidentUpdated } = require('../services/socketService');
        emitIncidentUpdated(io, incident._id, { status: 'PENDING', assignedTeam: null, offeredTo: null });
      }

      // Kích hoạt ngay lập tức tìm đội tiếp theo
      await addToAssignQueue(incident._id.toString());
      return { message: 'Timeout: Đã chuyển lại PENDING và xếp hàng tìm đội mới' };
    } else {
      // Chưa hết hạn → Schedule lại job để check sau X giây
      const remainingMs = incident.offerExpiresAt.getTime() - now.getTime() + 1000;
      await addToAssignQueue(incident._id.toString(), Math.max(0, remainingMs));
      return { message: `Đang chờ offer hết hạn trong ${Math.round(remainingMs/1000)}s` };
    }
  }

  // 2. Nếu ở PENDING → Thử tìm đội mới
  if (incident.status === 'PENDING') {
    if (incident.assignmentAttempts >= 3) {
      incident.isEscalated = true;
      incident.timeline.push({
        status: 'PENDING',
        updatedBy: null,
        note: `Tự động leo thang: Đã thử offer cho 3 đội khác nhau nhưng không thành công.`,
      });
      await incident.save();

      if (io) {
        io.to('dispatchers').emit('incident:escalated', {
          incidentId: incident._id,
          code: incident.code,
          message: 'Đã thử 3 lần không thành công, cần xử lý thủ công!',
        });
        const { emitIncidentUpdated } = require('../services/socketService');
        emitIncidentUpdated(io, incident._id, { status: 'PENDING', isEscalated: true });
      }
      return { message: 'Đã đạt giới hạn 3 lần thử, leo thang lên Dispatcher' };
    }

    const team = await autoAssignTeam(incident, io);
    if (team) {
      await addToAssignQueue(incident._id.toString(), timeoutSec * 1000 + 1000);
      return { message: `Đã gửi offer tới ${team.name}` };
    } else {
      // Không tìm được đội trong bán kính hiện tại
      // Tăng assignmentAttempts để lần thử tiếp sẽ mở rộng bán kính (1x → 2x → 3x)
      const currentAttempts = incident.assignmentAttempts || 0;
      const config2 = await SystemConfig.getSingleton();
      const baseRadius = config2.algoSettings?.searchRadiusKm || 5;
      const nextRadius = baseRadius * (currentAttempts + 2); // +2 vì +1 là lần này, +1 nữa là lần sau

      if (currentAttempts >= 3) {
        // Đã mở rộng tối đa 3 lần, leo thang
        incident.isEscalated = true;
        incident.timeline.push({
          status: 'PENDING',
          updatedBy: null,
          note: `Tự động leo thang: Đã quét bán kính ${baseRadius * (currentAttempts + 1)}km nhưng không tìm được đội phù hợp.`,
        });
        await incident.save();
        if (io) {
          io.to('dispatchers').emit('incident:escalated', {
            incidentId: incident._id,
            code: incident.code,
            message: `Đã quét bán kính ${baseRadius * (currentAttempts + 1)}km, không có đội khả thi!`,
          });
          const { emitIncidentUpdated } = require('../services/socketService');
          emitIncidentUpdated(io, incident._id, { status: 'PENDING', isEscalated: true });
        }
        return { message: `Không tìm được đội sau ${currentAttempts + 1} lần quét, leo thang` };
      }

      // Tăng attempts để lần sau mở rộng bán kính
      incident.assignmentAttempts = currentAttempts + 1;
      incident.timeline.push({
        status: 'PENDING',
        updatedBy: null,
        note: `Không tìm được đội trong R=${baseRadius * (currentAttempts + 1)}km. Sẽ mở rộng lên R=${nextRadius}km và thử lại.`,
      });
      await incident.save();

      if (io) {
        const { emitIncidentUpdated } = require('../services/socketService');
        emitIncidentUpdated(io, incident._id, { status: 'PENDING', assignmentAttempts: incident.assignmentAttempts });
      }

      // Thử lại ngay sau 5s với bán kính đã mở rộng
      await addToAssignQueue(incident._id.toString(), 5000);
      return { message: `Không tìm được đội trong R=${baseRadius * (currentAttempts + 1)}km, thử lại với R=${nextRadius}km sau 5s` };
    }
  }

  // 3. Phân tích dọn dẹp (Safety Check)
  // Nếu incident đã được gán hoặc bị hủy, nhưng vẫn còn dấu vết "offeredTo" mà đội đó đang kẹt PROPOSED
  if (incident.status !== 'OFFERING' && incident.offeredTo) {
    const RescueTeam = require('../models/RescueTeam');
    const offeredTeam = await RescueTeam.findById(incident.offeredTo);
    if (offeredTeam && offeredTeam.status === 'PROPOSED') {
      logger.info(`Cleaning up orphaned offer for team ${offeredTeam.name} on incident ${incident.code}`);
      const offeredTeamState = await recalculateTeamStatus(offeredTeam._id);
      if (io && offeredTeamState?.team) {
        io.to('dispatchers').emit('rescue:status-changed', {
          teamId: offeredTeamState.team._id,
          status: offeredTeamState.team.status,
        });
      }
    }
  }

  return { message: `Incident đã ở trạng thái ${incident.status}, skip` };
};

/**
 * Khởi tạo Bull Queue
 */
const initAutoAssignQueue = (io) => {
  globalIo = io;
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  assignQueue = new Bull(QUEUE_NAME, redisUrl, {
    redis: { maxRetriesPerRequest: null },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3, 
      backoff: { type: 'fixed', delay: 10000 }, 
    },
  });

  assignQueue.process(async (job) => {
    return await processAutoAssign(job.data.incidentId, globalIo);
  });

  logger.info('✅ Bull Queue auto-assign đã khởi tạo');
  return assignQueue;
};

/**
 * Thêm incident vào queue hoặc dùng fallback
 */
const addToAssignQueue = async (incidentId, delayMs = 0) => {
  if (!assignQueue) {
    logger.warn(`Queue chưa được khởi tạo. Sử dụng fallback setTimeout cho ${incidentId} (delay: ${delayMs}ms)`);
    setTimeout(async () => {
      try {
        await processAutoAssign(incidentId, globalIo);
      } catch (err) {
        logger.error(`[Fallback Error] ${err.message}`);
      }
    }, delayMs);
    return;
  }
  await assignQueue.add({ incidentId }, { delay: delayMs });
};

const scheduleRetry = async (incidentId) => {
  const config = await SystemConfig.getSingleton();
  const retryMs = (config.algoSettings?.assignmentTimeoutSec || 60) * 1000;
  await addToAssignQueue(incidentId, retryMs);
};

/**
 * Startup Recovery: Chạy một lần khi server khởi động.
 * Mục tiêu:
 *   1. Tìm tất cả incident OFFERING quá hạn → reset PENDING + re-queue
 *   2. Tìm tất cả incident PENDING chưa được xử lý → re-queue
 *   3. Tìm đội bị kẹt PROPOSED không còn incident nào → reset về AVAILABLE/OFFLINE
 */
const recoverStuckIncidentsOnStartup = async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // đợi DB kết nối xong
    logger.info('🔄 [Startup Recovery] Bắt đầu kiểm tra incident bị kẹt...');

    const now = new Date();

    // --- 1. Incidents OFFERING quá hạn ---
    const stuckOffering = await Incident.find({
      status: 'OFFERING',
      offerExpiresAt: { $lt: now },
    });

    for (const incident of stuckOffering) {
      logger.warn(`[Startup Recovery] Incident ${incident.code} kẹt OFFERING ${Math.round((now - incident.offerExpiresAt) / 60000)} phút. Reset → PENDING.`);
      const oldTeamId = incident.offeredTo;
      if (oldTeamId) {
        const alreadyRejected = (incident.rejectedTeams || []).some(
          (id) => id?.toString() === oldTeamId.toString()
        );
        if (!alreadyRejected) incident.rejectedTeams.push(oldTeamId);
      }
      incident.status = 'PENDING';
      incident.assignedTeam = null;
      incident.offeredTo = null;
      incident.offerExpiresAt = null;
      incident.timeline.push({
        status: 'PENDING',
        updatedBy: null,
        note: `[Startup Recovery] Offer hết hạn không có phản hồi — re-queue tìm đội mới.`,
      });
      await incident.save();
      if (oldTeamId) await recalculateTeamStatus(oldTeamId);
      await addToAssignQueue(incident._id.toString(), 2000);
    }

    // --- 2. Incidents PENDING (chưa assign) bị mồ côi (assignmentAttempts < 3) ---
    const pendingOrphan = await Incident.find({
      status: 'PENDING',
      isEscalated: { $ne: true },
      assignedTeam: null,
    });

    for (const incident of pendingOrphan) {
      logger.info(`[Startup Recovery] Incident ${incident.code} vẫn PENDING — re-queue.`);
      await addToAssignQueue(incident._id.toString(), 5000);
    }

    // --- 3. Đội kẹt PROPOSED mà không có OFFERING incident nào tương ứng ---
    const proposedTeams = await RescueTeam.find({ status: 'PROPOSED' });
    for (const team of proposedTeams) {
      const activeOffer = await Incident.findOne({
        status: 'OFFERING',
        offeredTo: team._id,
        offerExpiresAt: { $gt: now },
      });
      if (!activeOffer) {
        logger.warn(`[Startup Recovery] Đội ${team.name} kẹt PROPOSED không có offer hợp lệ → recalculate.`);
        await recalculateTeamStatus(team._id);
      }
    }

    logger.info(`🔄 [Startup Recovery] Hoàn thành: ${stuckOffering.length} OFFERING reset, ${pendingOrphan.length} PENDING re-queue, ${proposedTeams.length} PROPOSED đội kiểm tra.`);
  } catch (err) {
    logger.error(`[Startup Recovery] Lỗi: ${err.message}`);
  }
};

/**
 * Periodic Cleanup: chạy mỗi 2 phút để dọn incident/đội bị kẹt trong runtime.
 * Đây là safety net phòng trường hợp queue job bị drop giữa chừng.
 */
const startPeriodicCleanup = () => {
  const INTERVAL_MS = 2 * 60 * 1000; // 2 phút
  setInterval(async () => {
    try {
      const now = new Date();
      const stuckOffering = await Incident.find({
        status: 'OFFERING',
        offerExpiresAt: { $lt: now },
      });

      for (const incident of stuckOffering) {
        logger.warn(`[Periodic Cleanup] Incident ${incident.code} kẹt OFFERING → re-queue fallback.`);
        await addToAssignQueue(incident._id.toString(), 0);
      }

      if (stuckOffering.length > 0) {
        logger.info(`[Periodic Cleanup] Đã re-queue ${stuckOffering.length} incident bị kẹt.`);
      }
    } catch (err) {
      logger.error(`[Periodic Cleanup] Lỗi: ${err.message}`);
    }
  }, INTERVAL_MS);

  logger.info('⏱️  Periodic cleanup job khởi động (interval: 2 phút)');
};

module.exports = { initAutoAssignQueue, addToAssignQueue, scheduleRetry, recoverStuckIncidentsOnStartup, startPeriodicCleanup };
