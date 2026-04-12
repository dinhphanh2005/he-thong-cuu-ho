const mongoose = require('mongoose');

const rescueTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vui lòng nhập tên đội'], trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    type: {
      type: String,
      enum: ['AMBULANCE', 'TOW_TRUCK', 'FIRE', 'POLICE', 'MULTI'],
      required: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'PROPOSED', 'BUSY', 'OFFLINE', 'SUSPENDED'],
      default: 'AVAILABLE',
    },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    zone: { type: String, trim: true, index: true },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['LEADER', 'DRIVER', 'MEDIC', 'MEMBER'], default: 'MEMBER' },
      },
    ],
    capabilities: [{ type: String }],
    activeIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
    stats: {
      totalCompleted: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 }, // phút
    },
    lastLocationUpdate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

rescueTeamSchema.index({ currentLocation: '2dsphere' });
rescueTeamSchema.index({ status: 1 });

module.exports = mongoose.model('RescueTeam', rescueTeamSchema);
