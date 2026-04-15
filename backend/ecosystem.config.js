module.exports = {
  apps: [
    {
      name: 'cuu-ho-backend',
      script: 'src/server.js',
      // QUAN TRỌNG: Socket.IO dùng in-memory room. Cluster mode (instances > 1) sẽ làm mất
      // socket events giữa các worker — Dispatcher sẽ không nhận được GPS update.
      // Để scale multi-core, cần thêm @socket.io/redis-adapter trước.
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true
    }
  ]
};
