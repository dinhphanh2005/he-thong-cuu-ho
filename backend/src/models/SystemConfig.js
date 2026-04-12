const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  systemName: {
    type: String,
    default: 'Cứu Hộ Giao Thông',
  },
  hotline: {
    type: String,
    default: '1900 1234',
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  notificationSettings: {
    pushEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    template: { type: String, default: '[CUUHO.VN] Bạn có 1 đơn cứu hộ mới: Mã {incident_id} tại {location}. Vui lòng mở App để xác nhận.' },
  },
  algoSettings: {
    isAutoAssignEnabled: { type: Boolean, default: true },
    searchRadiusKm: { type: Number, default: 5 },
    expandRadiusOnFallback: { type: Boolean, default: true },
    assignmentTimeoutSec: { type: Number, default: 60 },
  },
  securitySettings: {
    require2FA: { type: Boolean, default: false },
    jwtSessionTimeoutMin: { type: Number, default: 120 },
    rateLimitMaxRequests: { type: Number, default: 100 },
    rateLimitWindowMin: { type: Number, default: 15 },
  },
  backupSettings: {
    autoBackupEnabled: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 7 },
    logCleanupMonths: { type: Number, default: 3 },
  }
}, { timestamps: true });

// Ensure only one config document exists
systemConfigSchema.statics.getSingleton = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
