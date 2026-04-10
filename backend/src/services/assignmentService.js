const RescueTeam = require('../models/RescueTeam');
const { notifyCitizenAssigned, notifyRescueTeamAssigned } = require('./notificationService');
const { recalculateTeamStatus } = require('./teamAvailabilityService');
const logger = require('../utils/logger');

const MAX_DISTANCE_METERS = 20000; // 20km

/**
 * Tìm và phân công đội cứu hộ gần nhất có thể xử lý sự cố
 * @param {Object} incident - Mongoose Incident document
 * @param {SocketIO.Server} io - Socket.IO instance
 * @returns {Object|null} - RescueTeam document hoặc null nếu không tìm được
 */
const autoAssignTeam = async (incident, io) => {
  try {
    // Ưu tiên tìm đội AVAILABLE gần nhất (MongoDB $near sort theo khoảng cách tăng dần)
    const nearestTeam = await RescueTeam.findOne({
      status: 'AVAILABLE',
      currentLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: incident.location.coordinates },
          $maxDistance: MAX_DISTANCE_METERS,
        },
      },
    }).populate('members.userId', 'name phone fcmToken');

    if (!nearestTeam) {
      logger.warn(`Auto-assign: Không tìm được đội nào trong ${MAX_DISTANCE_METERS / 1000}km cho sự cố ${incident.code}`);
      return null;
    }

    // Cập nhật sự cố
    incident.assignedTeam = nearestTeam._id;
    incident.status = 'ASSIGNED';
    incident.timeline.push({
      status: 'ASSIGNED',
      updatedBy: null,
      note: `Hệ thống tự động phân công đội ${nearestTeam.name} (${nearestTeam.code})`,
    });
    await incident.save();

    // Cập nhật đội
    nearestTeam.status = 'BUSY';
    nearestTeam.activeIncident = incident._id;
    await nearestTeam.save();

    // Socket.IO emit
    if (io) {
      io.emit('rescue:assigned', {
        incidentId: incident._id,
        rescueTeam: {
          _id: nearestTeam._id,
          name: nearestTeam.name,
          code: nearestTeam.code,
          type: nearestTeam.type,
          currentLocation: nearestTeam.currentLocation,
        },
      });

      // Thông báo riêng tới phòng của đội cứu hộ
      io.to(`rescue-team:${nearestTeam._id}`).emit('incident:assigned-to-me', {
        incident: {
          _id: incident._id,
          code: incident.code,
          type: incident.type,
          severity: incident.severity,
          location: incident.location,
          description: incident.description,
        },
      });
    }

    // Push notification
    await notifyCitizenAssigned(incident, nearestTeam.name);
    await notifyRescueTeamAssigned(incident, nearestTeam);

    logger.info(`Auto-assign thành công: ${nearestTeam.name} → sự cố ${incident.code}`);
    return nearestTeam;
  } catch (err) {
    logger.error(`Auto-assign thất bại cho sự cố ${incident.code}: ${err.message}`);
    return null;
  }
};

/**
 * Giải phóng đội cứu hộ và cập nhật stats khi sự cố hoàn thành
 * @param {Object} incident - Incident với completedAt đã được set
 */
const releaseTeam = async (incident) => {
  if (!incident.assignedTeam) return null;

  try {
    const team = await RescueTeam.findById(incident.assignedTeam);
    if (!team) return null;

    if (incident.status === 'COMPLETED') {
      const responseTimeMs = incident.completedAt - incident.createdAt;
      const responseTimeMin = Math.max(0, Math.round(responseTimeMs / 60000));
      const total = team.stats.totalCompleted + 1;
      team.stats.avgResponseTime = Math.round(
        (team.stats.avgResponseTime * team.stats.totalCompleted + responseTimeMin) / total
      );
      team.stats.totalCompleted = total;
    }

    team.activeIncident = null;
    await team.save();
    const teamState = await recalculateTeamStatus(team._id);

    logger.info(`Đội ${team.name} đã được giải phóng (sự cố ${incident.code})`);
    return teamState?.team || team;
  } catch (err) {
    logger.error(`releaseTeam thất bại: ${err.message}`);
    return null;
  }
};

module.exports = { autoAssignTeam, releaseTeam };
