const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vui lòng nhập họ tên'], trim: true },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ'],
    },
    phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại'],
      unique: true,
      match: [/^0[35789][0-9]{8}$/, 'SĐT Việt Nam không hợp lệ'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['ADMIN', 'DISPATCHER', 'RESCUE', 'CITIZEN'],
      default: 'CITIZEN',
    },
    rescueTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RescueTeam',
      required: function () { return this.role === 'RESCUE'; },
    },
    fcmToken: { type: String, default: null }, // Firebase Cloud Messaging
    refreshToken: { type: String, select: false, default: null },
    currentSessionId: { type: String, default: null },
    otpCode: { type: String, default: null },
    otpExpire: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    availabilityStatus: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE',
    },
    mustChangePassword: { type: Boolean, default: false },
    lastLogin: { type: Date },
    settings: {
      notifications: {
        sosSound: { type: Boolean, default: true },
        browser: { type: Boolean, default: false },
        assignment: { type: Boolean, default: true },
        summary: { type: Boolean, default: true },
      },
      mapConfig: {
        defaultMap: { type: String, default: 'TRAFFIC' },
        trafficLayer: { type: Boolean, default: true },
        showTeams: { type: Boolean, default: true },
        autoCenter: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

// Pre-save: hash mật khẩu
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Indexes tối ưu cho query thường dùng
userSchema.index({ role: 1 });                    // Lọc theo role (RBAC queries)
userSchema.index({ role: 1, isActive: 1 });       // Dashboard Admin: active users by role
userSchema.index({ lastLogin: -1 });              // Sắp xếp phiên đăng nhập mới nhất

module.exports = mongoose.model('User', userSchema);
