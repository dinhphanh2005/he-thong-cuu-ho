const Bull = require('bull');
const Incident = require('../models/Incident');
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
      // Không tìm được đội → Kiểm tra pool cạn kiệt
      const RescueTeam = require('../models/RescueTeam');
      const remainingTeamsCount = await RescueTeam.countDocuments({
        _id: { $nin: incident.rejectedTeams || [] }
      });

      if (remainingTeamsCount === 0) {
        incident.isEscalated = true;
        incident.timeline.push({
          status: 'PENDING',
          updatedBy: null,
          note: 'Tự động leo thang: Tất cả các đội phù hợp đã từ chối hoặc không có đội nào khác.',
        });
        await incident.save();
        if (io) {
          io.to('dispatchers').emit('incident:escalated', {
            incidentId: incident._id,
            code: incident.code,
            message: 'Tất cả đội đã từ chối hoặc không có đội khả thi, cần xử lý thủ công!',
          });
          const { emitIncidentUpdated } = require('../services/socketService');
          emitIncidentUpdated(io, incident._id, { status: 'PENDING', isEscalated: true });
        }
        return { message: 'Pool đội cứu hộ đã cạn kiệt, leo thang' };
      }

      // Thử lại sau 30s
      await addToAssignQueue(incident._id.toString(), 30000);
      return { message: 'Không tìm được đội phù hợp lúc này, sẽ thử lại sau 30s' };
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

module.exports = { initAutoAssignQueue, addToAssignQueue, scheduleRetry };
