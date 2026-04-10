const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Nội dung tin nhắn không được rỗng'],
      maxlength: [1000, 'Tin nhắn tối đa 1000 ký tự'],
      trim: true,
    },
    // Loại tin nhắn để phân biệt system message và user message
    messageType: {
      type: String,
      enum: ['TEXT', 'SYSTEM', 'IMAGE'],
      default: 'TEXT',
    },
    imageUrl: { type: String }, // Nếu gửi ảnh
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ incident: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
