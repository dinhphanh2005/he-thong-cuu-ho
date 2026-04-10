const Message = require('../models/Message');
const Incident = require('../models/Incident');

const canAccessChat = async (user, incidentId) => {
  if (['ADMIN', 'DISPATCHER'].includes(user.role)) return true;
  const incident = await Incident.findById(incidentId).select('reportedBy assignedTeam');
  if (!incident) return false;
  if (user.role === 'RESCUE') return incident.assignedTeam?.toString() === user.rescueTeam?._id?.toString();
  if (user.role === 'CITIZEN') return incident.reportedBy?.toString() === user._id.toString();
  return false;
};

exports.getMessages = async (req, res) => {
  const { incidentId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const allowed = await canAccessChat(req.user, incidentId);
  if (!allowed) return res.status(403).json({ success: false, message: 'Không có quyền truy cập chat này' });
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [messages, total] = await Promise.all([
    Message.find({ incident: incidentId }).populate('sender', 'name role').sort('createdAt').skip(skip).limit(parseInt(limit)),
    Message.countDocuments({ incident: incidentId }),
  ]);
  await Message.updateMany({ incident: incidentId, 'readBy.userId': { $ne: req.user._id } }, { $addToSet: { readBy: { userId: req.user._id, readAt: new Date() } } });
  res.status(200).json({ success: true, count: messages.length, total, data: messages });
};

exports.sendMessage = async (req, res) => {
  const { incidentId } = req.params;
  const { text } = req.body;
  const allowed = await canAccessChat(req.user, incidentId);
  if (!allowed) return res.status(403).json({ success: false, message: 'Không có quyền gửi tin nhắn' });
  const message = await Message.create({ incident: incidentId, sender: req.user._id, text: text.trim() });
  const populated = await message.populate('sender', 'name role');
  const io = req.app.get('io');
  if (io) io.to(`incident:${incidentId}`).emit('chat:message', { _id: populated._id, incidentId, sender: { _id: req.user._id, name: req.user.name, role: req.user.role }, text: populated.text, createdAt: populated.createdAt });
  res.status(201).json({ success: true, data: populated });
};
