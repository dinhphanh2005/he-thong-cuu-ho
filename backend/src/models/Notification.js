const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'INCIDENT_CREATED',   // Citizen: sự cố đã được tiếp nhận
        'INCIDENT_ASSIGNED',  // Citizen: đã có đội cứu hộ được phân công
        'INCIDENT_UPDATED',   // Citizen: cập nhật trạng thái
        'INCIDENT_COMPLETED', // Citizen: sự cố đã hoàn thành
        'SOS_ALERT',          // Dispatcher + Rescue: có tín hiệu SOS
        'NEW_INCIDENT',       // Rescue: có sự cố mới gần khu vực
        'ASSIGNED_TO_YOU',    // Rescue: đội bạn được phân công
        'SYSTEM',             // Thông báo hệ thống
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // Extra payload
    isRead: { type: Boolean, default: false },
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
    fcmMessageId: { type: String }, // ID từ Firebase để track
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
