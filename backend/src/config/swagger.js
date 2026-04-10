const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Hệ thống Cứu hộ Giao thông 🚨',
      version: '1.0.0',
      description: `
## Hướng dẫn sử dụng

1. Gọi **POST /api/v1/auth/dev/create-admin** để tạo tài khoản Admin (chỉ dùng lúc dev)
2. Gọi **POST /api/v1/auth/login** để lấy accessToken
3. Click nút **Authorize 🔒** ở trên, nhập accessToken vào ô Bearer
4. Gọi các API khác

## 4 Roles
- **ADMIN** — Quản trị hệ thống, tạo tài khoản
- **DISPATCHER** — Điều phối viên, xem bản đồ, phân công
- **RESCUE** — Đội cứu hộ, nhận và xử lý sự cố
- **CITIZEN** — Người dân, báo cáo sự cố, SOS
      `,
    },
    servers: [
      { url: 'http://localhost:5001', description: '🛠️ Development' },
      { url: 'https://api.cuuho.vn', description: '🚀 Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập accessToken từ /auth/login hoặc /auth/register',
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);
console.log(`📄 Swagger paths found: ${Object.keys(swaggerSpec.paths || {}).length}`);

const swaggerDocs = (app) => {
  // Raw JSON spec — dùng để debug hoặc import vào Postman
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(swaggerSpec);
  });

  // Custom HTML — load Swagger UI từ CDN, hoạt động trên Safari
  app.get('/api-docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚨 CuuHo API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .topbar-custom {
      background: #c0392b;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .topbar-custom h1 {
      color: white;
      font-size: 20px;
      font-weight: 700;
    }
    .topbar-custom span {
      color: rgba(255,255,255,0.8);
      font-size: 13px;
      background: rgba(0,0,0,0.2);
      padding: 2px 10px;
      border-radius: 12px;
    }
    #swagger-ui .swagger-ui .topbar { display: none !important; }
    #swagger-ui .swagger-ui .info .title { color: #c0392b; }
    #swagger-ui .swagger-ui .opblock-tag { font-size: 16px; }
    #swagger-ui .swagger-ui .btn.authorize {
      border-color: #c0392b;
      color: #c0392b;
    }
    #swagger-ui .swagger-ui .btn.authorize svg { fill: #c0392b; }
  </style>
</head>
<body>
  <div class="topbar-custom">
    <h1>🚨 CuuHo Giao Thong API</h1>
    <span>v1.0.0</span>
    <span>Development</span>
  </div>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        requestSnippetsEnabled: true,
        defaultModelsExpandDepth: -1,
        docExpansion: 'list',
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`);
  });

  // Redirect /api-docs/ → /api-docs (tránh lỗi 404 khi có trailing slash)
  app.get('/api-docs/', (req, res) => res.redirect('/api-docs'));

  console.log('📄 Swagger UI: http://localhost:5001/api-docs');
};

module.exports = swaggerDocs;
