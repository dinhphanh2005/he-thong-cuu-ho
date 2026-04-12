const RescueTeam = require('../models/RescueTeam');
const SystemConfig = require('../models/SystemConfig');
const { notifyCitizenAssigned, notifyRescueTeamAssigned } = require('./notificationService');
const { recalculateTeamStatus } = require('./teamAvailabilityService');
const { getRoute } = require('./routingService');
const logger = require('../utils/logger');

/**
 * Tìm và ĐỀ XUẤT phân công đội cứu hộ gần nhất (Uber-like Offer)
 * @param {Object} incident - Mongoose Incident document
 * @param {SocketIO.Server} io - Socket.IO instance
 * @returns {Object|null} - RescueTeam document hoặc null nếu không tìm được
 */
const autoAssignTeam = async (incident, io) => {
  try {
    const config = await SystemConfig.getSingleton();
    const maxDistanceMeters = (config.algoSettings?.searchRadiusKm || 5) * 1000;
    const timeoutSec = config.algoSettings?.assignmentTimeoutSec || 35;
    const staleGpsMinutes = 60;

    const FIVE_MIN_AGO = new Date(Date.now() - staleGpsMinutes * 60 * 1000);
    const rejectedIds = (incident.rejectedTeams || []).map(id => id.toString());
    logger.info(`Auto-assign [${incident.code}]: Bựa tìm đội (R=${maxDistanceMeters/1000}km, rejected=[${rejectedIds}])`);

    let nearestTeam = await RescueTeam.findOne({
      status: 'AVAILABLE',
      _id: { $nin: incident.rejectedTeams || [] },
      lastLocationUpdate: { $gte: FIVE_MIN_AGO },
      currentLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: incident.location.coordinates },
          $maxDistance: maxDistanceMeters,
        },
      },
    }).populate('members.userId', 'name phone fcmToken');

    if (nearestTeam) {
      logger.info(`Auto-assign [${incident.code}]: Tìm được đội gần: ${nearestTeam.name}`);
    }

    // Fallback 1: ignore GPS distance/freshness, find ANY available team
    if (!nearestTeam) {
      // Log all available teams for diagnostics
      const allAvailable = await RescueTeam.find({
        status: 'AVAILABLE',
        _id: { $nin: incident.rejectedTeams || [] },
      }).select('name status lastLocationUpdate currentLocation');
      logger.warn(`Auto-assign [${incident.code}]: GPS query thất bại. Các đội AVAILABLE không bị từ chối: [${allAvailable.map(t => `${t.name}(GPS:${t.lastLocationUpdate ? new Date(t.lastLocationUpdate).toISOString() : 'none'})`).join(', ')}]`);

      nearestTeam = allAvailable[0] ? await RescueTeam.findById(allAvailable[0]._id).populate('members.userId', 'name phone fcmToken') : null;
      if (nearestTeam) {
        logger.info(`Auto-assign [${incident.code}]: Fallback tìm được đội: ${nearestTeam.name}`);
      }
    }

    if (!nearestTeam) {
      // Full diagnostic: any team regardless of status
      const anyTeam = await RescueTeam.find({ _id: { $nin: incident.rejectedTeams || [] } }).select('name status').limit(5);
      logger.warn(`Auto-assign [${incident.code}]: Không tìm được đội nào! Các đội tồn tại: [${anyTeam.map(t => `${t.name}(${t.status})`).join(', ')}]`);
      return null;
    }

    // Cập nhật sự cố sang trạng thái OFFERING
    incident.status = 'OFFERING';
    incident.offeredTo = nearestTeam._id;
    incident.offerExpiresAt = new Date(Date.now() + timeoutSec * 1000);
    incident.assignmentAttempts = (incident.assignmentAttempts || 0) + 1;
    
    // Tính toán lộ trình nháp (chỉ khi đội có GPS)
    const routeInfo = nearestTeam.currentLocation?.coordinates
      ? await getRoute(nearestTeam.currentLocation.coordinates, incident.location.coordinates)
      : null;
    if (routeInfo) {
      incident.routingPath = routeInfo.path;
      incident.estimatedArrival = new Date(Date.now() + routeInfo.duration * 1000);
    }

    incident.timeline.push({
      status: 'OFFERING',
      updatedBy: null,
      note: `Hệ thống gửi đề xuất tới đội ${nearestTeam.name} (Lần ${incident.assignmentAttempts})`,
    });
    await incident.save();

    // Cập nhật đội sang trạng thái PROPOSED
    nearestTeam.status = 'PROPOSED';
    await nearestTeam.save();

    // Socket.IO emit ĐỀ XUẤT tới đội cứu hộ
    if (io) {
      // Thông báo cho Dispatcher về trạng thái Offering
      io.to('dispatchers').emit('incident:offering', {
        incidentId: incident._id,
        teamId: nearestTeam._id,
        teamName: nearestTeam.name,
        expiresAt: incident.offerExpiresAt,
        attempt: incident.assignmentAttempts
      });
      const { emitIncidentUpdated } = require('./socketService');
      emitIncidentUpdated(io, incident._id, {
        status: 'OFFERING',
        offeredTo: nearestTeam._id,
        assignmentAttempts: incident.assignmentAttempts,
      });

      // Thông báo riêng tới đội cứu hộ
      io.to(`rescue-team:${nearestTeam._id}`).emit('incident:offer', {
        incident: {
          _id: incident._id,
          code: incident.code,
          type: incident.type,
          severity: incident.severity,
          location: incident.location,
          description: incident.description,
          distance: routeInfo ? Math.round(routeInfo.distance / 100) / 10 : null // km
        },
        timeoutSec
      });
    }

    // Push notification (Silent alert or standard)
    await notifyRescueTeamAssigned(incident, nearestTeam);

    logger.info(`Auto-assign [Offering]: ${nearestTeam.name} (Attempt ${incident.assignmentAttempts}) → ${incident.code}`);
    return nearestTeam;
  } catch (err) {
    logger.error(`Auto-assign OFFERING thất bại cho ${incident.code}: ${err.message}`);
    return null;
  }
};

/**
 * Giải phóng đội cứu hộ và cập nhật stats khi sự cố hoàn thành
 * @param {Object} incident - Incident với completedAt đã được set
 */
const releaseTeam = async (incident) => {
  if (!incident?._id) return null;

  try {
    let team = null;
    if (incident.assignedTeam) {
      team = await RescueTeam.findById(incident.assignedTeam);
    }

    if (team && incident.status === 'COMPLETED') {
      const responseTimeMs = incident.completedAt - incident.createdAt;
      const responseTimeMin = Math.max(0, Math.round(responseTimeMs / 60000));
      const total = team.stats.totalCompleted + 1;
      team.stats.avgResponseTime = Math.round(
        (team.stats.avgResponseTime * team.stats.totalCompleted + responseTimeMin) / total
      );
      team.stats.totalCompleted = total;
    }

    // Defensive cleanup: in case of historical re-assignments, multiple teams can
    // still reference the same incident as activeIncident.
    const linkedTeams = await RescueTeam.find({ activeIncident: incident._id }).select('_id name');

    for (const linkedTeam of linkedTeams) {
      if (team && linkedTeam._id.toString() === team._id.toString()) {
        team.activeIncident = null;
        await team.save();
        continue;
      }

      linkedTeam.activeIncident = null;
      await linkedTeam.save();
      await recalculateTeamStatus(linkedTeam._id);
    }

    if (!team) return null;

    const teamState = await recalculateTeamStatus(team._id);

    logger.info(`Đội ${team.name} đã được giải phóng (sự cố ${incident.code})`);
    return teamState?.team || team;
  } catch (err) {
    logger.error(`releaseTeam thất bại: ${err.message}`);
    return null;
  }
};

module.exports = { autoAssignTeam, releaseTeam };
