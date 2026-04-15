const Message = require('../models/Message');
const User = require('../models/User');
const RescueTeam = require('../models/RescueTeam');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Khởi tạo toàn bộ Socket.IO event handlers
 * @param {SocketIO.Server} io
 */
const initSocketService = (io) => {
  // Middleware xác thực JWT cho socket connection
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Cho phép guest connect (chỉ dùng track incident)
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select('name role rescueTeam isActive currentSessionId')
        .populate('rescueTeam', 'name code zone');

      if (!user || !user.isActive) {
        socket.user = null;
        return next();
      }

      // Kiểm tra session ID — nếu token của phiên cũ thì reject ngay
      // (user đã login từ thiết bị khác và currentSessionId đã cập nhật)
      if (decoded.sid && user.currentSessionId && decoded.sid !== user.currentSessionId) {
        logger.warn(`[socket] Stale session detected: userId=${user._id}, token.sid=${decoded.sid}, db.sid=${user.currentSessionId} — reject`);
        // Emit trước khi gọi next(error) để client nhận được lý do
        socket.emit('auth:session-invalidated', {
          reason: 'Tài khoản đã đăng nhập từ thiết bị khác.',
        });
        return next(new Error('SESSION_INVALIDATED'));
      }

      socket.user = user;
      next();
    } catch (err) {
      // Token không hợp lệ → connect như guest
      socket.user = null;
      next();
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user?._id?.toString();
    const role = user?.role;

    logger.debug(`Socket connected: ${socket.id} | Role: ${role || 'GUEST'}`);

    // ==========================================
    // TỰ ĐỘNG JOIN ROOMS DỰA VÀO ROLE
    // ==========================================

    if (role === 'DISPATCHER' || role === 'ADMIN') {
      socket.join('dispatchers');
      logger.debug(`${role} ${userId} joined room: dispatchers`);
    }

    if (role === 'RESCUE' && user.rescueTeam) {
      const teamId = user.rescueTeam._id?.toString();
      const zone = user.rescueTeam.zone;
      socket.join(`rescue-team:${teamId}`);
      if (zone) socket.join(`zone:${zone}`);
      logger.debug(`RESCUE ${userId} joined rooms: rescue-team:${teamId}, zone:${zone}`);
    }

    if (userId) {
      socket.join(`user:${userId}`); // Room riêng cho mỗi user
    }

    // ==========================================
    // CITIZEN: Theo dõi sự cố theo mã tracking
    // ==========================================
    socket.on('track:join', (code) => {
      if (typeof code === 'string' && code.length > 0) {
        socket.join(`track:${code.toUpperCase()}`);
      }
    });

    socket.on('track:leave', (code) => {
      socket.leave(`track:${code?.toUpperCase()}`);
    });

    // ==========================================
    // RESCUE: Cập nhật GPS theo thời gian thực
    // ==========================================
    socket.on('rescue:updateLocation', async ({ lat, lng }) => {
      if (role !== 'RESCUE' || !user.rescueTeam) return;

      try {
        const teamId = user.rescueTeam._id;
        await RescueTeam.findByIdAndUpdate(teamId, {
          'currentLocation.coordinates': [lng, lat],
          lastLocationUpdate: new Date(),
        });

        // Phát tới tất cả để cập nhật bản đồ
        io.emit('rescue:location', {
          teamId,
          teamName: user.rescueTeam.name,
          coordinates: [lng, lat],
          updatedAt: new Date(),
        });
      } catch (err) {
        logger.error(`Socket rescue:updateLocation lỗi: ${err.message}`);
      }
    });

    socket.on('rescue:arriving-soon', ({ code, distance }) => {
      if (role !== 'RESCUE') return;
      io.to(`track:${code}`).emit('incident:status-change', { 
        message: `Đội cứu hộ sắp đến hiện trường (cách ~${distance}m)` 
      });
      // Phát cả incident:updated để citizen lấy dc msg
      io.emit('incident:updated', {
        code,
        message: `Đội cứu hộ sắp đến (cách ~${distance}m)`
      });
    });

    // ==========================================
    // CHAT: Gửi tin nhắn trong kênh sự cố
    // ==========================================
    socket.on('chat:join', (incidentId) => {
      if (typeof incidentId === 'string') {
        socket.join(`incident:${incidentId}`);
      }
    });

    socket.on('chat:leave', (incidentId) => {
      socket.leave(`incident:${incidentId}`);
    });

    socket.on('chat:message', async ({ incidentId, text }) => {
      if (!userId || !incidentId || !text?.trim()) return;

      try {
        const message = await Message.create({
          incident: incidentId,
          sender: userId,
          text: text.trim(),
        });

        const populated = await message.populate('sender', 'name role');

        io.to(`incident:${incidentId}`).emit('chat:message', {
          _id: populated._id,
          incidentId,
          sender: { _id: userId, name: user.name, role },
          text: populated.text,
          createdAt: populated.createdAt,
        });
      } catch (err) {
        socket.emit('chat:error', { message: 'Gửi tin nhắn thất bại' });
        logger.error(`Socket chat:message lỗi: ${err.message}`);
      }
    });

    // RESCUE: Chủ động tham gia room của đội (để tránh stale state khi reconnect)
    socket.on('rescue:join-team', (teamId) => {
      if (role === 'RESCUE' && teamId) {
        socket.join(`rescue-team:${teamId}`);
        logger.debug(`RESCUE user ${userId} explicitly joined room: rescue-team:${teamId}`);
      }
    });

    // ==========================================
    // DISCONNECT
    // ==========================================
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('⚡ Socket.IO service đã khởi tạo xong');
};

/**
 * Phát sự cố mới tới đúng audience
 * @param {SocketIO.Server} io
 * @param {Object} incident
 */
const emitNewIncident = (io, incident) => {
  const payload = {
    message: 'Có sự cố mới!',
    incident: {
      _id: incident._id,
      code: incident.code,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      location: incident.location,
      createdAt: incident.createdAt,
    },
  };

  // Tất cả dispatcher đều nhận
  io.to('dispatchers').emit('incident:new', payload);

  // Nếu có zone → chỉ phát tới rescue teams trong zone đó
  const zone = incident.location?.zone || incident.location?.address;
  if (zone) {
    io.to(`zone:${zone}`).emit('incident:new', payload);
  } else {
    // Không biết zone → phát broadcast (tất cả rescue teams nhận)
    io.emit('incident:new', payload);
  }
};

/**
 * Phát cập nhật trạng thái sự cố
 */
const emitIncidentUpdated = (io, incidentId, statusData) => {
  // Đảm bảo id và assignedTeam luôn có mặt để mobile app nhận diện
  const payload = { 
    id: incidentId, 
    _id: incidentId,
    ...statusData 
  };
  
  io.emit('incident:updated', payload);
  
  // Phát tới citizen đang track
  if (statusData.code) {
    io.to(`track:${statusData.code}`).emit('incident:status-change', statusData);
  }
};

/**
 * Phát SOS alert toàn hệ thống
 */
const emitSOSAlert = (io, incident) => {
  io.emit('alert:sos', {
    priority: 'HIGH',
    message: 'CẢNH BÁO: CÓ TÍN HIỆU SOS KHẨN CẤP!',
    incident: {
      _id: incident._id,
      code: incident.code,
      location: incident.location,
      createdAt: incident.createdAt,
    },
  });
};

module.exports = { initSocketService, emitNewIncident, emitIncidentUpdated, emitSOSAlert };
