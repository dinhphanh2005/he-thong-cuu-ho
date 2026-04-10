const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

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
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:19006'];

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

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/v1/auth', authRoutes);
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
