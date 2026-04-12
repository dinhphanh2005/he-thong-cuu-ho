const SystemConfig = require('../models/SystemConfig');

/**
 * Middleware to check globally if the system is in maintenance mode.
 * Admins are exempted to allow fix/management.
 */
const maintenanceCheck = async (req, res, next) => {
  try {
    const config = await SystemConfig.getSingleton();
    
    if (config.maintenanceMode && req.user?.role !== 'ADMIN') {
      return res.status(503).json({
        success: false,
        message: 'Hệ thống đang bảo trì để nâng cấp. Vui lòng quay lại sau!',
        maintenanceMode: true,
        retryAfter: 300 // 5 minutes hint
      });
    }
    
    next();
  } catch (err) {
    // If config fails, we continue to avoid locking the system
    next();
  }
};

module.exports = { maintenanceCheck };
