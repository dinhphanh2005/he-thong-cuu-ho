# Hệ thống Cứu hộ Giao thông (Traffic Rescue System)

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Backend](https://img.shields.io/badge/backend-NodeJS-blue.svg)]()
[![Frontend](https://img.shields.io/badge/frontend-React-cyan.svg)]()
[![Mobile](https://img.shields.io/badge/mobile-Expo-black.svg)]()

---

## 🇻🇳 Giới thiệu (Overview)
Hệ thống Cứu hộ Giao thông là một nền tảng toàn diện giúp kết nối người gặp sự cố giao thông với đội cứu hộ gần nhất. Hệ thống bao gồm ứng dụng di động cho người dùng, cổng thông tin điều phối thời gian thực và quản trị hệ thống.

Traffic Rescue System is a comprehensive platform connecting people in traffic incidents with the nearest rescue teams. The system includes a mobile app for users, a real-time dispatch portal, and administrative management.

### 🚀 Tính năng chính (Key Features)

#### 🧑‍🤝‍🧑 Người dân (Citizen)
*   **SOS & Cứu hộ**: Gửi yêu cầu cứu hộ khẩn cấp kèm vị trí GPS chính xác. (Send emergency rescue requests with precise GPS location).
*   **Theo dõi thời gian thực**: Xem vị trí xe cứu hộ đang di chuyển trên bản đồ. (Track rescue vehicle movement in real-time).
*   **Chat trực tiếp**: Giao tiếp với điều phối viên và đội cứu hộ. (Direct chat with dispatchers and rescue teams).

#### 🚒 Đội cứu hộ (Rescue Team)
*   **Nhận tin báo**: Nhận thông báo sự cố tức thì qua ứng dụng di động. (Instant incident alerts via mobile app).
*   **Cập nhật trạng thái**: Cập nhật vị trí và tiến độ xử lý (Đã đến, Đã xong). (Update location and processing progress).

#### 🎧 Điều phối viên (Dispatcher)
*   **Dashboard trực quan**: Theo dõi toàn bộ sự cố và đội cứu hộ trên bản đồ. (Monitor all incidents and rescue teams on a live map).
*   **Phân công tự động**: Hệ thống tự động tìm đội cứu hộ gần nhất. (Auto-assign the nearest rescue team).
*   **Quản lý sự cố**: Tiếp nhận và xử lý yêu cầu cứu hộ qua điện thoại hoặc ứng dụng. (Receive and process rescue requests).

#### ⚙️ Quản trị viên (Admin)
*   **Quản lý hệ thống**: Quản lý tài khoản, đội cứu hộ và cấu hình. (Manage accounts, rescue teams, and configurations).
*   **Báo cáo & Thống kê**: Xem Heatmap sự cố và hiệu suất làm việc. (View incident heatmaps and performance statistics).

---

## 🛠 Stack Công nghệ (Tech Stack)

### Backend
*   **Core**: NodeJS, Express v5
*   **Database**: MongoDB (Mongoose), Redis (Caching & Job Queue)
*   **Real-time**: Socket.IO
*   **Jobs**: Bull Queue
*   **Notifications**: Firebase FCM
*   **Testing**: Jest, Supertest

### Frontend Web (Admin & Dispatcher)
*   **Core**: React 19, Vite, TypeScript
*   **Styling**: Tailwind CSS v4
*   **State**: Redux Toolkit, React Query
*   **Maps**: Leaflet

### Mobile App
*   **Platform**: React Native (Expo)
*   **Maps**: React Native Maps
*   **Notification**: Expo Notifications

### CI/CD & DevOps
*   **Containerization**: Docker, Docker Compose
*   **Web Server**: Nginx
*   **CI/CD**: GitHub Actions

---

## 📂 Cấu trúc dự án (Project Structure)
```text
he-thong-cuu-ho/
├── .github/workflows/                  # CI/CD workflows (GitHub Actions)
├── backend/                            # API Server, Database, Socket.io
├── frontend_web/                       # Cổng Dispatcher & Admin (React)
├── frontend_mobile/                    # Ứng dụng di động (Expo)
├── CuuHo_API_Postman_Collection.json   # File thư viện API Postman
├── docker-compose.yml                  # File cấu hình Docker (môi trường kịch bản Dev/Local)
├── docker-compose.prod.yml             # File cấu hình Docker (môi trường kịch bản Production)
├── nginx.conf.template                 # Template cấu hình Nginx Server
├── README.md                           # Tài liệu tổng quan (File này)
├── DEPLOY_GUIDE.md                     # Hướng dẫn Deploy (Docker, VPS)
├── TESTING_GUIDE.md                    # Hướng dẫn Kiểm thử tự động (Unit Test, Integration Test)
└── USER_MANUAL.md                      # Hướng dẫn Sử dụng hệ thống cho User, Dispatcher, Admin
```

---

## ⚙️ Hướng dẫn cài đặt (Installation)

### Điều kiện tiên quyết (Prerequisites)
*   Node.js v20+
*   MongoDB Atlas hoặc Local MongoDB
*   Redis server
*   Expo CLI (cho Mobile)
*   Docker & Docker Compose (cho triển khai Production)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env # Cấu hình biến môi trường
npm run dev
```

### 2. Frontend Web Setup
```bash
cd frontend_web
npm install
npm run dev
```

### 3. Frontend Mobile Setup
```bash
cd frontend_mobile
npm install
npx expo start
```

### 4. Setup bằng Docker (Tùy chọn)
Tham khảo chi tiết tại `DEPLOY_GUIDE.md` để khởi chạy nhanh toàn bộ môi trường với Docker.

---

## 🧪 Kiểm thử (Testing)
Dự án có bộ Test-case đầy đủ bằng Jest. Chạy bộ kiểm thử toàn diện cho Backend:
```bash
cd backend
npm test
```
*(Tham khảo thêm `TESTING_GUIDE.md` để biết thêm chi tiết).*

---

## 📄 Tài liệu tham khảo (Documentation)
*   [Hướng dẫn Triển khai (Deployment Guide)](DEPLOY_GUIDE.md): Chi tiết đóng gói Docker và deploy VPS.
*   [Hướng dẫn Testing (Testing Guide)](TESTING_GUIDE.md): Cấu trúc bộ test, coverage và cách chạy.
*   [Hướng dẫn Sử dụng (User Manual)](USER_MANUAL.md): Chức năng từng màn hình và luồng thao tác.

---
© 2026 Traffic Rescue System.
