# Hướng dẫn Chạy Kiểm thử — Hệ thống Cứu hộ Giao thông

---

## 1. Cài đặt (chạy 1 lần duy nhất)

```bash
cd backend
npm install
```

Lần đầu chạy test, Jest sẽ **tự động tải** MongoDB binary (~100–150 MB về máy).  
Những lần sau dùng bản đã cache → khởi động nhanh hơn nhiều.

---

## 2. Chạy toàn bộ bộ test

```bash
cd backend
npm test
```

---

## 3. Chạy với báo cáo coverage (dùng trong báo cáo)

```bash
cd backend
npm run test:coverage
```

Hoặc tương đương:

```bash
cd backend
npx jest --coverage --runInBand --forceExit
```

Kết quả sẽ in ra bảng như sau:

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
controllers/              |         |          |         |         |
  adminController.js      |   62.5  |   48.3   |   71.4  |   62.5  |
  authController.js       |   58.2  |   41.7   |   65.0  |   58.2  |
  incidentController.js   |   54.8  |   39.2   |   60.0  |   54.8  |
  ...                     |         |          |         |         |
--------------------------|---------|----------|---------|---------|
```

---

## 4. Chạy từng nhóm test riêng

```bash
# TC-01 → TC-14 (file chính thức trong báo cáo)
npx jest tests/official_testcases.test.js --runInBand --verbose

# Nhóm Auth & Authorization
npx jest tests/auth.test.js --runInBand --verbose

# Nhóm Incidents
npx jest tests/incidents.test.js --runInBand --verbose

# Nhóm Rescue Teams
npx jest tests/rescueTeams.test.js --runInBand --verbose

# Nhóm Reports & KPI
npx jest tests/reports.test.js --runInBand --verbose

# Nhóm Security
npx jest tests/security.test.js --runInBand --verbose

# Nhóm Notifications
npx jest tests/notifications.test.js --runInBand --verbose

# Nhóm Maintenance Mode
npx jest tests/maintenance.test.js --runInBand --verbose
```

---

## 5. Cấu trúc thư mục test

```
backend/
├── src/
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── incidentController.js
│   │   └── ...
│   ├── services/
│   ├── middleware/
│   └── routes/
│
└── tests/                          ← Toàn bộ test files
    ├── setup.js                    ← MongoDB in-memory + env config
    ├── helpers.js                  ← Factory functions (createUser, createTeam...)
    ├── official_testcases.test.js  ← TC-01 → TC-14 (file báo cáo)
    ├── auth.test.js
    ├── incidents.test.js
    ├── rescueTeams.test.js
    ├── reports.test.js
    ├── security.test.js
    ├── notifications.test.js
    └── maintenance.test.js
```

**Tổng cộng: 8 file test, ~70 test cases**

---

## 6. Danh sách Test Cases chính thức (TC-01 → TC-14)

| Mã TC | Tên | Nhóm |
|-------|-----|-------|
| TC-01 | Đăng nhập DISPATCHER | Auth |
| TC-02 | CITIZEN gọi API Admin → 403 | Auth |
| TC-03 | Tạo báo cáo sự cố (đầy đủ + ảnh) | Incidents |
| TC-04 | Cập nhật trạng thái + ghi timeline | Incidents |
| TC-05 | Auto-assign tìm đội gần nhất | Dispatch |
| TC-06 | OSRM Routing + lưu routingPath | Dispatch |
| TC-07 | Admin tạo đội + sinh tài khoản | Dispatch |
| TC-08 | SOS khẩn cấp → code SOS-* + CRITICAL | Real-time |
| TC-09 | GPS tracking cập nhật DB | Real-time |
| TC-10 | Chat nội bộ → DB + socket | Real-time |
| TC-11 | Auto-reconnect config hợp lệ | Real-time |
| TC-12 | Rate limiting → 429 từ req thứ 51 | Security |
| TC-13 | Bcrypt hash mật khẩu trong DB | Security |
| TC-14 | FCM notification khi hoàn thành | Security |

---

## 7. Ghi chú quan trọng

- **`--runInBand`** — chạy test tuần tự, tránh race condition với MongoDB
- **Lần đầu chạy** — cần download MongoDB binary, mất 1–2 phút
- **Firebase & Redis** — được tắt tự động trong test (`NODE_ENV=test`)
- **Mỗi test độc lập** — `afterEach` xóa sạch DB sau mỗi test, không ảnh hưởng nhau
