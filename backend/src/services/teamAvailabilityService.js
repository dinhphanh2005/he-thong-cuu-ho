const RescueTeam = require('../models/RescueTeam');
const User = require('../models/User');

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
    team.status = 'BUSY';
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
