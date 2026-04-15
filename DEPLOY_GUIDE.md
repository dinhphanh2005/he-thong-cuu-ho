# Hướng dẫn Deploy Production

## 1. Môi trường AWS EC2 & Nginx
1. Thuê 1 server AWS EC2, HDH Ubuntu 24.04 (hoặc 22.04 LTS), cấu hình tối thiểu `t3.small` (Nên dùng `t3.medium` để tránh đơ lúc build).
2. Mở Security Group trên AWS console: Cổng `22 (SSH)`, cổng `80 (HTTP)`, cổng `443 (HTTPS)`.
3. SSH vào Server và cài đặt cơ bản:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install nginx -y
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   nvm install 20
   npm install -g pm2 yarn
   ```
4. Copy `nginx.conf.template` vào `/etc/nginx/sites-available/cuuho.conf`. Symlink sang `sites-enabled`.

## 2. Tạo file `.env.production` (Bắt buộc trước khi start server)

Trên EC2, tạo file `backend/.env.production` với nội dung sau (thay hết các giá trị):

```env
NODE_ENV=production
PORT=5001

# MongoDB Atlas URI (thay thế sau khi tạo Atlas cluster)
MONGO_URI=mongodb+srv://admin:<password>@cluster0.xxx.mongodb.net/cuuho?retryWrites=true&w=majority

# JWT (dùng lệnh: openssl rand -base64 64 để tạo)
JWT_SECRET=<random_64_char_secret>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<another_random_64_char_secret>
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis (nếu dùng local Redis trên cùng EC2)
REDIS_URL=redis://127.0.0.1:6379

# CORS (danh sách domain frontend, ngăn cách bằng dấu phẩy)
CORS_ORIGINS=https://yourdomain.com

# Firebase Admin SDK (lấy từ Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=<your_project_id>
FIREBASE_CLIENT_EMAIL=<service_account_email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Thư mục upload ảnh
UPLOAD_PATH=uploads

# Rate Limiting (tùy chỉnh nếu cần)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=500
```

> [!WARNING]
> Không bao giờ commit file `.env.production` lên git. Kiểm tra `.gitignore` đã có `.env*`.

## 3. Di dời dữ liệu lên MongoDB Atlas
1. Tạo account MongoDB Atlas và tạo một Cluster mới.
2. Tạo DB user (lưu trữ password) và Network Access (cho phép IP của EC2 connect tới hoặc `0.0.0.0/0` - không khuyến nghị).
3. Lấy URL kết nối Cluster. (Ví dụ: `mongodb+srv://admin:<password>@cluster0.xxx.mongodb.net/cuuho?retryWrites=true&w=majority`).
4. Nếu đang có data ở local, dùng `mongodump` và `mongorestore` để đẩy cục data từ máy tính lên URI Mới của Atlas.

## 4. Cài đặt SSL Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

## 5. GitHub Actions CI/CD (Tuỳ chọn)
Để tự động Deploy mỗi khi push lên nhánh `main`, bạn cần viết file Workflow đặt ở `.github/workflows/deploy.yml`, trong đó kết nối bằng Appleboy ssh-action tới EC2 và kéo code trên Server về và dùng PM2 reload.

## 6. Khởi chạy và Giám sát bằng PM2 + Datadog
1. Kéo code về EC2: `git clone <repo>`
2. Cài NPM package Backend: `cd backend && npm ci`
3. Chạy App Backend với profile Cluster: `pm2 start ecosystem.config.js`
4. Cài NPM Frontend và Build ra file tĩnh cho Nginx:
   ```bash
   cd ../frontend_web
   npm ci
   npm run build
   ```
5. Đăng ký DD (Datadog) Agent, chạy lệnh curl trực tiếp từ trang web của DD để cài Agent giám sát Server.

---
Bạn có thể tham khảo `docker-compose.prod.yml` nếu muốn đóng gói toàn bộ server (NextJS, Backend) dùng container thay cho việc cài Native bằng PM2 ở trên.
