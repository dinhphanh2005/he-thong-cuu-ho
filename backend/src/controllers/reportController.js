const Incident = require('../models/Incident');
const RescueTeam = require('../models/RescueTeam');

exports.getSummary = async (req, res) => {
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  const [total, byStatus, byType, bySeverity, teamStats, avgResult] = await Promise.all([
    Incident.countDocuments(filter),
    Incident.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Incident.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Incident.aggregate([{ $match: filter }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    RescueTeam.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Incident.aggregate([
      { $match: { ...filter, status: 'COMPLETED', completedAt: { $exists: true } } },
      { $project: { responseTimeMin: { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 60000] } } },
      { $group: { _id: null, avg: { $avg: '$responseTimeMin' }, min: { $min: '$responseTimeMin' }, max: { $max: '$responseTimeMin' } } },
    ]),
  ]);
  const sosCount = await Incident.countDocuments({ ...filter, code: { $regex: /^SOS-/ } });
  const stats = avgResult[0] || { avg: 0, min: 0, max: 0 };
  res.status(200).json({ success: true, data: { total, sosCount, avgResponseTimeMinutes: Math.round(stats.avg), minResponseTimeMinutes: Math.round(stats.min), maxResponseTimeMinutes: Math.round(stats.max), byStatus, byType, bySeverity, teamStats } });
};

exports.getHeatmap = async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.from || req.query.to) { filter.createdAt = {}; if (req.query.from) filter.createdAt.$gte = new Date(req.query.from); if (req.query.to) filter.createdAt.$lte = new Date(req.query.to); }
  const incidents = await Incident.find(filter).select('location.coordinates type severity status createdAt code');
  const intensityMap = { LOW: 0.2, MEDIUM: 0.4, HIGH: 0.7, CRITICAL: 1.0 };
  const data = incidents.map((inc) => ({ lat: inc.location.coordinates[1], lng: inc.location.coordinates[0], type: inc.type, severity: inc.severity, status: inc.status, code: inc.code, createdAt: inc.createdAt, intensity: intensityMap[inc.severity] || 0.5 }));
  res.status(200).json({ success: true, count: data.length, data });
};

exports.getTimeline = async (req, res) => {
  const { groupBy = 'day', from, to } = req.query;
  const filter = {};
  if (from) filter.createdAt = { ...filter.createdAt, $gte: new Date(from) };
  if (to) filter.createdAt = { ...filter.createdAt, $lte: new Date(to) };
  const fmt = groupBy === 'month' ? '%Y-%m' : groupBy === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
  const timeline = await Incident.aggregate([{ $match: filter }, { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt' } }, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } }, sos: { $sum: { $cond: [{ $regexMatch: { input: '$code', regex: /^SOS-/ } }, 1, 0] } } } }, { $sort: { _id: 1 } }]);
  res.status(200).json({ success: true, data: timeline });
};

exports.getTeamPerformance = async (req, res) => {
  const teams = await RescueTeam.find().select('name code type zone stats').sort('-stats.totalCompleted');
  res.status(200).json({ success: true, data: teams });
};
