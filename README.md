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

---

## 📂 Cấu trúc dự án (Project Structure)
```text
he-thong-cuu-ho/
├── backend/            # API Server, Database, Socket.io
├── frontend_web/       # Cổng Dispatcher & Admin (React)
├── frontend_mobile/    # Ứng dụng di động (Expo)
└── docker-compose.yml  # Đóng gói Docker
```

---

## ⚙️ Hướng dẫn cài đặt (Installation)

### Điều kiện tiên quyết (Prerequisites)
*   Node.js v20+
*   MongoDB Atlas hoặc Local MongoDB
*   Redis server
*   Expo CLI (cho Mobile)

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

---

## 🧪 Kiểm thử (Testing)
Chạy bộ kiểm thử toàn diện cho Backend:
```bash
cd backend
npm test
```

---

## 📄 Tài liệu tham khảo (Documentation)
*   [Hướng dẫn Triển khai (Deployment Guide)](DEPLOY_GUIDE.md)
*   [Kế hoạch Kiểm thử (Test Plan)](ANALYSIS_AND_TEST_PLAN.md)
*   [Hướng dẫn Testing (Testing Guide)](TESTING_GUIDE.md)

---
© 2026 Traffic Rescue System.
