const mongoose = require('mongoose');
const INCIDENT_STATUSES = ['PENDING', 'ASSIGNED', 'ARRIVED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'HANDLED_BY_EXTERNAL'];

const timelineEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: INCIDENT_STATUSES,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    type: {
      type: String,
      enum: ['ACCIDENT', 'BREAKDOWN', 'FLOOD', 'FIRE', 'OTHER'],
      required: [true, 'Vui lòng chọn loại sự cố'],
    },
    status: {
      type: String,
      enum: INCIDENT_STATUSES,
      default: 'PENDING',
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String },
    },
    description: { type: String, required: [true, 'Vui lòng mô tả sự cố'] },
    photos: [{ type: String }],
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    callerPhone: {
      type: String,
      match: [/^0[35789][0-9]{8}$/, 'SĐT không hợp lệ'],
    },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'RescueTeam', default: null },
    timeline: [timelineEntrySchema],
    isEscalated: { type: Boolean, default: false },
    estimatedArrival: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
