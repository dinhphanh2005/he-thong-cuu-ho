const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Options mặc định tốt nhất cho Mongoose 8+
      family: 4, // Ép Node.js dùng IPv4, tránh lỗi ECONNREFUSED khi phân giải DNS qua IPv6
    });
    logger.info(`✅ MongoDB kết nối: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB thất bại: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
