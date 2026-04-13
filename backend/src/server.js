require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const { initFirebase } = require('./config/firebase');
const { initSocketService } = require('./services/socketService');
const { initAutoAssignQueue } = require('./jobs/autoAssignJob');
const { initDailyReportQueue } = require('./jobs/dailyReportJob');
const logger = require('./utils/logger');

// ==========================================
// KHỞI TẠO DATABASE
// ==========================================
connectDB();

// ==========================================
// FIREBASE ADMIN SDK
// ==========================================
initFirebase();

// ==========================================
// HTTP SERVER + SOCKET.IO
// ==========================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:19006'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Tối ưu cho mobile (đường truyền không ổn định)
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
});

// Gắn io vào app để controllers dùng được qua req.app.get('io')
app.set('io', io);

// ==========================================
// KHỞI TẠO SOCKET.IO SERVICE
// ==========================================
initSocketService(io);

// ==========================================
// KHỞI TẠO BULL QUEUES (cần Redis)
// ==========================================
let assignQueue, reportQueue;
try {
  assignQueue = initAutoAssignQueue(io);
  reportQueue = initDailyReportQueue();
} catch (err) {
  logger.warn(`Bull Queue không khởi tạo được (Redis chưa kết nối?): ${err.message}`);
  logger.warn('Hệ thống sẽ chạy không có background jobs — auto-assign vẫn hoạt động đồng bộ');
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} nhận được — đang đóng server gracefully...`);

  server.close(async () => {
    logger.info('HTTP server đã đóng');

    try {
      if (assignQueue) await assignQueue.close();
      if (reportQueue) await reportQueue.close();

      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('MongoDB đã đóng kết nối');

      process.exit(0);
    } catch (err) {
      logger.error(`Lỗi khi shutdown: ${err.message}`);
      process.exit(1);
    }
  });

  // Force kill sau 10 giây nếu vẫn chưa đóng xong
  setTimeout(() => {
    logger.error('Graceful shutdown timeout — force exit');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// ==========================================
// KHỞI ĐỘNG SERVER
// ==========================================
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  logger.info(`🚀 Server đang chạy: http://localhost:${PORT}`);
  logger.info(`📄 Swagger UI: http://localhost:${PORT}/api-docs`);
  logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
  logger.info(`⚡ Socket.IO: sẵn sàng`);
  logger.info(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { server, io }; // Export cho testing
