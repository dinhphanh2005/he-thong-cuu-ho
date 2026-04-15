const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
// express-mongo-sanitize removed: incompatible with Express v5 (req.query is read-only)
// Replaced with custom sanitizer below that only touches req.body and req.params

const swaggerDocs = require('./config/swagger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const rescueTeamRoutes = require('./routes/rescueTeamRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const geoRoutes = require('./routes/geoRoutes');

const app = express();

// ==========================================
// SECURITY HEADERS
// ==========================================
app.use((req, res, next) => {
  // Tắt hoàn toàn helmet cho Swagger UI routes
  if (req.path.startsWith('/api-docs')) return next();
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'unpkg.com'],
        imgSrc: ["'self'", 'data:', 'unpkg.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'unpkg.com'],
      },
    },
  })(req, res, next);
});

// ==========================================
// CORS
// ==========================================
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:19006', 'http://localhost:5001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ==========================================
// REQUEST PARSING
// ==========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// NOSQL INJECTION PROTECTION (custom — Express v5 compatible)
// ==========================================
// express-mongo-sanitize không tương thích với Express v5 (req.query là getter-only)
// Middleware tự viết: chỉ sanitize req.body và req.params, không động và req.query
const hasMongoBadKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return false;
  return Object.keys(obj).some((k) => k.startsWith('$') || hasMongoBadKeys(obj[k]));
};

app.use((req, res, next) => {
  if (hasMongoBadKeys(req.body) || hasMongoBadKeys(req.params)) {
    logger.warn(`⚠️  NoSQL Injection attempt: ${req.method} ${req.originalUrl} ip=${req.ip}`);
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ: chứa toán tử MongoDB bị cấm',
    });
  }
  next();
});

// ==========================================
// HTTP LOGGER (Morgan → Winston)
// ==========================================
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: () => process.env.NODE_ENV === 'test',
}));

// ==========================================
// STATIC FILES (ảnh upload)
// ==========================================
const uploadPath = path.join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
app.use('/uploads', express.static(uploadPath));

// ==========================================
// RATE LIMITER CHUNG
// ==========================================
app.use('/api', generalLimiter);

// ==========================================
// SWAGGER DOCS
// ==========================================
swaggerDocs(app);

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Cứu hộ Giao thông đang hoạt động 🚨',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

const { maintenanceCheck } = require('./middleware/maintenanceMiddleware');
const { protect } = require('./middleware/authMiddleware');

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/v1/auth', authRoutes);

// Protect all following routes and check for maintenance
// Ngoại lệ: /incidents/track/:code là PUBLIC — không cần đăng nhập
app.use('/api/v1', (req, res, next) => {
  // Cho phép track incident công khai (người dân tra mã, không đăng nhập)
  if (req.method === 'GET' && /^\/incidents\/track\//i.test(req.path)) {
    return next(); // Bỏ qua protect + maintenanceCheck
  }
  // Mọi route khác: yêu cầu auth + kiểm tra bảo trì
  protect(req, res, (err) => {
    if (err) return next(err);
    maintenanceCheck(req, res, next);
  });
});

app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/rescue-teams', rescueTeamRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/geo', geoRoutes);

// ==========================================
// ERROR HANDLING (phải đặt cuối cùng)
// ==========================================
app.use(notFound);
app.use(errorHandler);

module.exports = app;
