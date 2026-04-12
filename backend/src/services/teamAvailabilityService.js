const RescueTeam = require('../models/RescueTeam');
const User = require('../models/User');
const Incident = require('../models/Incident');

const MIN_ONLINE_MEMBERS = 2;

async function countOnlineMembers(teamId) {
  return User.countDocuments({
    role: 'RESCUE',
    rescueTeam: teamId,
    isActive: true,
    availabilityStatus: 'ONLINE',
  });
}

async function recalculateTeamStatus(teamId) {
  const team = await RescueTeam.findById(teamId);
  if (!team) return null;

  const onlineMembersCount = await countOnlineMembers(teamId);

  if (team.activeIncident) {
    const incident = await Incident.findById(team.activeIncident);
    const isStillAssigned = incident && incident.assignedTeam?.toString() === team._id.toString();
    const isActive = incident && !['COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL'].includes(incident.status);

    if (isStillAssigned && isActive) {
      team.status = 'BUSY';
    } else {
      // Clear orphaned or finished incident link
      team.activeIncident = null;
      if (onlineMembersCount >= MIN_ONLINE_MEMBERS) {
        team.status = 'AVAILABLE';
      } else {
        team.status = 'OFFLINE';
      }
    }
  } else if (onlineMembersCount >= MIN_ONLINE_MEMBERS) {
    team.status = 'AVAILABLE';
  } else {
    team.status = 'OFFLINE';
  }

  await team.save();

  return {
    team,
    onlineMembersCount,
    minimumOnlineMembers: MIN_ONLINE_MEMBERS,
    canAcceptAssignments: team.status === 'AVAILABLE',
  };
}

function decorateTeam(teamDoc, onlineMembersCount) {
  if (!teamDoc) return null;
  const team = teamDoc.toObject ? teamDoc.toObject() : { ...teamDoc };
  const resolvedOnlineCount = typeof onlineMembersCount === 'number'
    ? onlineMembersCount
    : (team.members || []).filter((member) => member.userId?.availabilityStatus === 'ONLINE' && member.userId?.isActive !== false).length;

  return {
    ...team,
    onlineMembersCount: resolvedOnlineCount,
    minimumOnlineMembers: MIN_ONLINE_MEMBERS,
    canAcceptAssignments: team.status === 'AVAILABLE',
  };
}

module.exports = {
  MIN_ONLINE_MEMBERS,
  countOnlineMembers,
  recalculateTeamStatus,
  decorateTeam,
};
