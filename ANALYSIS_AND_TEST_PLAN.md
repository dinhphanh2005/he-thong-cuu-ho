# Phân tích Code, Debug & Kế hoạch Test — Hệ thống Cứu hộ Giao thông

---

## 1. TÓM TẮT TỔNG QUAN CODEBASE

### Stack
- **Backend**: NodeJS + Express v5 + MongoDB (Mongoose) + Redis + Socket.IO + Bull Queue + Firebase FCM
- **Frontend Web**: ReactJS + Vite + Tailwind CSS + Leaflet + Recharts
- **Frontend Mobile**: Dự án riêng (`frontend_mobile/`)

### Cấu trúc Backend APIs đã implement
| Route | Method | Auth | Chú thích |
|-------|--------|------|-----------|
| `/auth/*` | Nhiều | Mix | Login, register, OTP, 2FA, change-pwd, settings |
| `/incidents/*` | Nhiều | JWT | CRUD incidents, SOS, track |
| `/rescue-teams/*` | Nhiều | JWT | CRUD teams, GPS, assign |
| `/admin/*` | Nhiều | ADMIN only | Dashboard, users, teams, config |
| `/reports/*` | Nhiều | DISPATCHER+ADMIN | Summary, heatmap, timeline, team-perf |
| `/chat/*` | GET/POST | JWT | Chat per incident |
| `/notifications/*` | Nhiều | JWT | Notification inbox |
| `/geo/*` | GET | JWT | Reverse geocode, search place |

---

## 2. LỖI NGHIÊM TRỌNG (Critical Bugs)

### BUG-01: `fetchDashboard` trong AppContext dùng ADMIN-only route cho cả DISPATCHER
**File**: `frontend_web/src/context/AppContext.jsx` + `frontend_web/src/services/api.js`

**Mô tả**: `AppContext.fetchDashboard()` gọi `reportAPI.getDashboard()` → `GET /admin/dashboard`.  
Route `/admin/dashboard` có middleware `authorize('ADMIN')`. Khi DISPATCHER đăng nhập và AppProvider mount, nó gọi `fetchAll()` → `fetchDashboard()` → **403 Forbidden**.  
→ `dashboard` sẽ luôn là `null` với role DISPATCHER → Dashboard UI hiển thị toàn 0.

**Root cause**:
```js
// api.js - WRONG
export const reportAPI = {
  getDashboard: () => api.get('/admin/dashboard'), // ← ADMIN only!
};
// AppContext - dùng cả với DISPATCHER
await Promise.all([fetchMe(), fetchIncidents(), fetchTeams(), fetchDashboard(), fetchConfig()]);
```

**Fix**:
```js
// api.js
export const reportAPI = {
  getDashboard: () => api.get('/reports/summary'), // ← dùng reports/summary
};
```
Hoặc tạo endpoint `/dashboard` riêng không giới hạn role.

---

### BUG-02: `fetchConfig` gọi `/admin/config` — DISPATCHER bị 403
**File**: `frontend_web/src/context/AppContext.jsx`

**Mô tả**: `fetchConfig()` gọi `adminAPI.getConfig()` → `GET /admin/config` (ADMIN only).  
DISPATCHER sẽ bị 403 → `config` = `null` → Dispatch Settings page có thể crash khi truy cập `personalSettings`.

**Fix**: Tách config thành 2 loại: system config (admin) và user personal config. Hoặc bỏ `fetchConfig` khỏi `fetchAll()` của AppContext, chỉ gọi trong Admin Settings.

---

### BUG-03: `SUSPENDED` team status không được render trong Fleet.jsx
**File**: `frontend_web/src/pages/dispatch/Fleet.jsx`

**Mô tả**: Backend `RescueTeam` model có status enum `['AVAILABLE', 'PROPOSED', 'BUSY', 'OFFLINE', 'SUSPENDED']`. Admin có thể suspend team qua `PATCH /admin/rescue-teams/:id/toggle-suspend`. Nhưng Fleet.jsx chỉ có:
```js
const STATUS_META = {
  AVAILABLE: { ... },
  BUSY: { ... },
  OFFLINE: { ... },
  // SUSPENDED → THIẾU!
};
```
→ Team bị suspend sẽ hiển thị blank/undefined label.

**Fix**: Thêm `SUSPENDED` vào `STATUS_META`.

---

### BUG-04: `OFFERING` status thiếu trong STATUS_LABELS của IncidentDetailPanel
**File**: `frontend_web/src/components/IncidentDetailPanel.jsx`

**Mô tả**: Backend auto-assign tạo ra status `OFFERING` khi đang chờ rescue confirm (35s timeout). `IncidentDetailPanel.STATUS_LABELS` không có `OFFERING` → badge sẽ trống.

**Fix**: Thêm `OFFERING: { label: 'Đang đề xuất đội', color: 'bg-orange-100 text-orange-700' }`.

---

### BUG-05: `incidentAPI.cancelIncident` thiếu trong api.js
**File**: `frontend_web/src/services/api.js`

**Mô tả**: Backend có `PATCH /incidents/:id/cancel` (Dispatcher/Admin) nhưng frontend không có method này trong `incidentAPI`. Nếu UI cần hủy sự cố, không có cách gọi.

**Fix**:
```js
export const incidentAPI = {
  ...
  cancel: (id, reason) => api.patch(`/incidents/${id}/cancel`, { reason }),
};
```

---

## 3. GAPS: UI CÓ MÀ BACKEND THIẾU / CHƯA ĐƯỢC KẾT NỐI

### GAP-01: Reports page không dùng Report API (quan trọng)
**File**: `frontend_web/src/pages/admin/Reports.jsx`

**Mô tả**: Trang Reports.jsx tính toán thống kê từ `incidents` trong AppContext thay vì gọi:
- `GET /reports/summary` (thống kê tổng hợp, avgResponseTime, byStatus, byType...)
- `GET /reports/timeline` (biểu đồ thời gian)
- `GET /reports/team-performance` (hiệu suất đội)

→ Dữ liệu thiếu `avgResponseTime`, `minResponseTime`, `maxResponseTime`, team ranking thực sự từ DB.

**Fix**: Thêm vào `api.js`:
```js
export const reportAPI = {
  getSummary: (params) => api.get('/reports/summary', { params }),
  getTimeline: (params) => api.get('/reports/timeline', { params }),
  getTeamPerformance: () => api.get('/reports/team-performance'),
  // getDashboard đổi sang:
  getDashboard: () => api.get('/reports/summary'),
};
```
Và cập nhật Reports.jsx để dùng các API này.

---

### GAP-02: Notifications chưa được kết nối Frontend (thiếu hoàn toàn)
**Mô tả**: Backend có full notification system:
- `GET /notifications` — inbox
- `PATCH /notifications/read-all`
- `PATCH /notifications/:id/read`
- `DELETE /notifications/cleanup`

Nhưng frontend **không có** `notificationAPI` trong `api.js` và không có UI notification bell.

**Fix**: Thêm:
```js
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  cleanup: () => api.delete('/notifications/cleanup'),
};
```
Thêm notification bell vào DispatchLayout/AdminLayout.

---

### GAP-03: Geo API chưa được kết nối Frontend
**Mô tả**: `/geo/reverse` và `/geo/search` đã implement backend nhưng không có trong `api.js`.  
Frontend có thể đang gọi Nominatim trực tiếp, bỏ qua backend proxy.

**Fix**:
```js
export const geoAPI = {
  reverse: (lat, lng) => api.get('/geo/reverse', { params: { lat, lng } }),
  search: (q) => api.get('/geo/search', { params: { q } }),
};
```

---

### GAP-04: `authAPI.verifyOTP` thiếu
**Mô tả**: Backend có `POST /auth/verify-otp` (xác thực OTP reset password) nhưng api.js chỉ có `verify2FA` (maps to `/auth/verify-2fa` - dùng cho 2FA login).

**Fix**:
```js
export const authAPI = {
  ...
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
};
```

---

### GAP-05: `authAPI.register` thiếu
**Mô tả**: Backend có `POST /auth/register` cho Citizen tự đăng ký nhưng api.js không có. Mobile app có thể dùng riêng, nhưng web cũng cần nếu muốn support.

---

### GAP-06: Socket room `incident:*` — Frontend không join khi mở IncidentDetailPanel
**File**: `frontend_web/src/components/IncidentDetailPanel.jsx`

**Mô tả**: Backend chat gửi message tới room `incident:${incidentId}` (xem chatController.js). Frontend Contacts.jsx có join room đúng (`socket.emit('chat:join', activeIncident._id)`). Tuy nhiên IncidentDetailPanel không join room `incident:*` nên không nhận real-time updates qua socket khi mở detail panel riêng.

---

### GAP-07: Admin Settings — `handleManualBackup` không có backend endpoint tương ứng
**File**: `frontend_web/src/pages/admin/Settings.jsx`

**Mô tả**: UI có nút "Sao lưu thủ công" (handleManualBackup) nhưng không có backend API endpoint tương ứng. Nút này sẽ gọi gì? Cần verify.

---

## 4. LOGGING & DEBUG

### Log hiện tại (Backend)
Backend dùng `winston` (`src/utils/logger.js`). Log đầy đủ:
- `logger.info(...)` cho auth, assign, socket
- `logger.warn(...)` cho session mismatch, stale GPS
- `logger.error(...)` cho các exception

**Vấn đề logging**: Error middleware (`errorMiddleware.js`) cần verify có catch được lỗi async không.

### Đề xuất thêm log
Thêm request logging chi tiết hơn cho các route critical:
- Auto-assign: log từng bước tìm kiếm đội
- Socket connect/disconnect với userId
- Cache hit/miss

---

## 5. KẾ HOẠCH SỬA LỖI (Fix Plan)

### Priority 1 — Sửa ngay (Critical)
| ID | Mô tả | File | Effort |
|----|-------|------|--------|
| BUG-01 | `fetchDashboard` → đổi endpoint sang `/reports/summary` | api.js, AppContext | 30 phút |
| BUG-02 | Bỏ `fetchConfig` ra khỏi fetchAll cho DISPATCHER | AppContext | 20 phút |
| BUG-03 | Thêm `SUSPENDED` vào STATUS_META | Fleet.jsx | 10 phút |
| BUG-04 | Thêm `OFFERING` vào STATUS_LABELS | IncidentDetailPanel | 10 phút |
| BUG-05 | Thêm `cancelIncident` vào incidentAPI | api.js | 10 phút |

### Priority 2 — Sửa trong Sprint tiếp theo
| ID | Mô tả | Effort |
|----|-------|--------|
| GAP-01 | Reports page dùng Report API thực sự | 4 giờ |
| GAP-02 | Kết nối Notifications UI | 6 giờ |
| GAP-03 | Dùng Geo API qua backend thay vì gọi Nominatim trực tiếp | 2 giờ |
| GAP-04 | Thêm `verifyOTP` vào authAPI | 30 phút |

---

## 6. TEST CASES

### TC-01: Authentication & Authorization

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-01-01 | Login với email + password hợp lệ (ADMIN) | 200 + accessToken + refreshToken | P1 |
| TC-01-02 | Login với phone + password hợp lệ (DISPATCHER) | 200 + tokens | P1 |
| TC-01-03 | Login với sai password | 401 | P1 |
| TC-01-04 | Login tài khoản bị khóa (isActive=false) | 403 | P1 |
| TC-01-05 | Refresh token hợp lệ | 200 + tokens mới | P1 |
| TC-01-06 | Refresh token hết hạn | 401 | P1 |
| TC-01-07 | DISPATCHER truy cập `/admin/dashboard` | 403 | P1 |
| TC-01-08 | CITIZEN truy cập `/incidents` (GET all) | 403 | P1 |
| TC-01-09 | Change password lần đầu (mustChangePassword=true) | 200 + mustChangePassword cleared | P1 |
| TC-01-10 | Login từ 2 thiết bị — thiết bị cũ nhận `auth:session-invalidated` socket | Socket event | P2 |

### TC-02: Incidents

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-02-01 | CITIZEN tạo incident với coordinates hợp lệ (trong VN) | 201 + code INC-xxx | P1 |
| TC-02-02 | CITIZEN tạo incident với coordinates ngoài VN | 400 "Nằm ngoài phạm vi" | P1 |
| TC-02-03 | DISPATCHER tạo incident với callerPhone | 201 + callerPhone stored | P1 |
| TC-02-04 | Upload photos khi tạo incident (multipart/form-data) | 201 + photos array | P1 |
| TC-02-05 | Lấy danh sách incidents (DISPATCHER) | 200 + pagination | P1 |
| TC-02-06 | Lấy chi tiết incident theo ID | 200 + timeline | P1 |
| TC-02-07 | RESCUE cập nhật status: ASSIGNED → ARRIVED | 200 | P1 |
| TC-02-08 | RESCUE cập nhật status invalid transition (PENDING → COMPLETED) | 400/422 | P1 |
| TC-02-09 | DISPATCHER hủy incident (cancel) | 200 + status CANCELLED | P1 |
| TC-02-10 | Citizen track incident bằng code (public route) | 200 + info | P1 |
| TC-02-11 | SOS từ Citizen — emit `alert:sos` socket tới `dispatchers` room | Socket event | P1 |
| TC-02-12 | SOS rate limit: 4 lần trong 30 giây (prod) | 429 | P2 |
| TC-02-13 | Auto-assign: tạo incident → team AVAILABLE gần nhất được propose | status=OFFERING | P1 |
| TC-02-14 | Auto-assign fail (không có team): incident giữ PENDING + schedule retry | status=PENDING | P1 |

### TC-03: Rescue Teams

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-03-01 | ADMIN tạo rescue team mới | 201 + team object | P1 |
| TC-03-02 | ADMIN cập nhật rescue team | 200 | P1 |
| TC-03-03 | ADMIN xóa team đang BUSY | 400 "đang xử lý sự cố" | P1 |
| TC-03-04 | ADMIN xóa team OFFLINE | 200 | P1 |
| TC-03-05 | ADMIN suspend team → status=SUSPENDED | 200 | P1 |
| TC-03-06 | RESCUE cập nhật GPS location | 200 + socket `rescue:location` broadcast | P1 |
| TC-03-07 | DISPATCHER phân công thủ công team cho incident | 200 + socket `rescue:assigned` | P1 |
| TC-03-08 | Phân công team đang BUSY | 400 | P1 |
| TC-03-09 | RESCUE accept incident (OFFERING → ASSIGNED) | 200 + team status BUSY | P1 |
| TC-03-10 | RESCUE refuse incident → team reject list + tìm team khác | 200 + auto re-assign | P1 |

### TC-04: Chat (Socket.IO)

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-04-01 | DISPATCHER gửi tin nhắn cho incident đang active | 201 + socket `chat:message` | P1 |
| TC-04-02 | RESCUE gửi tin nhắn (assigned team) | 201 | P1 |
| TC-04-03 | CITIZEN không liên quan cố gửi tin nhắn | 403 | P1 |
| TC-04-04 | Lấy lịch sử chat theo incidentId | 200 + messages array | P1 |
| TC-04-05 | Gửi tin nhắn dài hơn 1000 ký tự | 400 validation | P2 |

### TC-05: Admin Panel

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-05-01 | ADMIN tạo Dispatcher account | 201 + defaultPassword | P1 |
| TC-05-02 | Tạo Dispatcher với email trùng | 400 | P1 |
| TC-05-03 | ADMIN tạo rescue member gắn vào team | 201 + member added to team | P1 |
| TC-05-04 | ADMIN lấy danh sách users (filter by role) | 200 + pagination | P1 |
| TC-05-05 | ADMIN toggle active/inactive user | 200 + status updated | P1 |
| TC-05-06 | ADMIN reset password user | 200 + defaultPassword | P1 |
| TC-05-07 | Admin dashboard stats (totalIncidents, activeIncidents) | 200 + stats object | P1 |
| TC-05-08 | ADMIN update system config (autoAssign ON/OFF) | 200 + socket broadcast | P1 |

### TC-06: Notifications

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-06-01 | Lấy notifications của user | 200 + unreadCount | P1 |
| TC-06-02 | Mark notification đã đọc | 200 | P1 |
| TC-06-03 | Mark all read | 200 | P1 |
| TC-06-04 | FCM push khi incident completed | FCM call fired | P2 |
| TC-06-05 | FCM push khi SOS | FCM broadcast | P2 |

### TC-07: Reports

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-07-01 | GET /reports/summary không filter | 200 + total, byStatus, avgResponseTime | P1 |
| TC-07-02 | GET /reports/summary với date range | 200 + filtered data | P1 |
| TC-07-03 | GET /reports/timeline groupBy=day | 200 + timeline array | P1 |
| TC-07-04 | GET /reports/heatmap | 200 + [{lat, lng, intensity}] | P1 |
| TC-07-05 | GET /reports/team-performance (ADMIN only) | 200 + sorted teams | P1 |
| TC-07-06 | DISPATCHER gọi team-performance | 403 | P2 |

### TC-08: Security & Rate Limiting

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| TC-08-01 | Auth rate limit: 31 lần đăng nhập trong 15 phút (prod) | 429 | P2 |
| TC-08-02 | Input validation: SQL injection trong body | 400 (sanitized) | P1 |
| TC-08-03 | JWT tampered token | 401 | P1 |
| TC-08-04 | Expired JWT | 401 | P1 |
| TC-08-05 | Concurrent session: token cũ sau khi re-login | 401 "session invalidated" | P2 |

---

## 7. TEST CODE (Backend — Jest + Supertest)

### Setup: `backend/tests/setup.js`
```js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRE = '1h';
  process.env.JWT_REFRESH_EXPIRE = '7d';
  process.env.NODE_ENV = 'test';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});
```

### `backend/tests/helpers.js`
```js
const User = require('../src/models/User');
const RescueTeam = require('../src/models/RescueTeam');
const jwt = require('jsonwebtoken');

/**
 * Tạo user và return JWT token
 */
const createUser = async (overrides = {}) => {
  const defaults = {
    name: 'Test User',
    email: `user${Date.now()}@test.com`,
    phone: `090${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '123456',
    role: 'CITIZEN',
    isActive: true,
    mustChangePassword: false,
  };
  const user = await User.create({ ...defaults, ...overrides });
  const sessionId = 'test-session-id';
  user.currentSessionId = sessionId;
  await user.save();
  const token = jwt.sign(
    { id: user._id, role: user.role, sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { user, token };
};

const createAdmin = (overrides = {}) => createUser({ role: 'ADMIN', ...overrides });
const createDispatcher = (overrides = {}) => createUser({ role: 'DISPATCHER', ...overrides });

/**
 * Tạo RescueTeam với location Hà Nội
 */
const createTeam = async (overrides = {}) => {
  const defaults = {
    name: 'Test Rescue Team',
    code: `TEST-${Date.now()}`,
    type: 'AMBULANCE',
    zone: 'Hoàn Kiếm',
    status: 'AVAILABLE',
    currentLocation: { type: 'Point', coordinates: [105.8412, 21.0245] },
    lastLocationUpdate: new Date(),
  };
  return RescueTeam.create({ ...defaults, ...overrides });
};

module.exports = { createUser, createAdmin, createDispatcher, createTeam };
```

### `backend/tests/auth.test.js`
```js
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { createAdmin, createDispatcher } = require('./helpers');

describe('Auth API', () => {
  // TC-01-01
  test('TC-01-01: Login ADMIN với email+password hợp lệ', async () => {
    await createAdmin({ email: 'admin@test.com', passwordHash: 'admin123' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'admin@test.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  // TC-01-02
  test('TC-01-02: Login bằng số điện thoại', async () => {
    await User.create({
      name: 'Dispatcher Test', email: 'disp@test.com',
      phone: '0901234567', passwordHash: 'disp123',
      role: 'DISPATCHER', isActive: true, mustChangePassword: false,
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: '0901234567', password: 'disp123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  // TC-01-03
  test('TC-01-03: Login sai password → 401', async () => {
    await createAdmin({ email: 'admin2@test.com', passwordHash: 'correct' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'admin2@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TC-01-04
  test('TC-01-04: Login tài khoản bị khóa → 403', async () => {
    await User.create({
      name: 'Locked', email: 'locked@test.com', phone: '0901111111',
      passwordHash: 'pass123', role: 'DISPATCHER', isActive: false, mustChangePassword: false,
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'locked@test.com', password: 'pass123' });

    expect(res.status).toBe(403);
  });

  // TC-01-07
  test('TC-01-07: DISPATCHER truy cập /admin/dashboard → 403', async () => {
    const { token } = await createDispatcher({ email: 'disp2@test.com', passwordHash: 'pass' });
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  // TC-01-08
  test('TC-01-08: CITIZEN truy cập GET /incidents → 403', async () => {
    const { token } = await createUser({ email: 'citizen@test.com', passwordHash: 'pass', role: 'CITIZEN' });
    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  // TC-01-09
  test('TC-01-09: Change password lần đầu đăng nhập', async () => {
    const { user, token } = await createDispatcher({
      email: 'newdisp@test.com', passwordHash: 'defaultPass',
      mustChangePassword: true,
    });
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'newSecurePass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Verify mustChangePassword cleared
    const updated = await User.findById(user._id);
    expect(updated.mustChangePassword).toBe(false);
  });
});
```

### `backend/tests/incidents.test.js`
```js
const request = require('supertest');
const app = require('../src/app');
const Incident = require('../src/models/Incident');
const { createUser, createDispatcher, createAdmin, createTeam } = require('./helpers');

describe('Incidents API', () => {
  // TC-02-01
  test('TC-02-01: CITIZEN tạo incident với coordinates hợp lệ', async () => {
    const { token } = await createUser({
      email: 'cit@test.com', passwordHash: 'pass', role: 'CITIZEN'
    });
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([105.8412, 21.0245]))
      .field('description', 'Tai nạn nghiêm trọng tại ngã tư');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toMatch(/^INC-/);
    expect(res.body.data.status).toBe('PENDING');
  });

  // TC-02-02
  test('TC-02-02: Tạo incident ngoài VN → 400', async () => {
    const { token } = await createUser({
      email: 'cit2@test.com', passwordHash: 'pass', role: 'CITIZEN'
    });
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([2.3522, 48.8566])) // Paris
      .field('description', 'Test ngoài VN');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('ngoài phạm vi');
  });

  // TC-02-03
  test('TC-02-03: DISPATCHER tạo incident với callerPhone', async () => {
    const { token } = await createDispatcher({ email: 'disp@test.com', passwordHash: 'pass' });
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'BREAKDOWN')
      .field('severity', 'MEDIUM')
      .field('coordinates', JSON.stringify([105.8412, 21.0245]))
      .field('description', 'Hỏng xe trên đường')
      .field('callerPhone', '0901234567');

    expect(res.status).toBe(201);
    expect(res.body.data.callerPhone).toBe('0901234567');
  });

  // TC-02-09
  test('TC-02-09: DISPATCHER hủy incident', async () => {
    const { token } = await createDispatcher({ email: 'disp3@test.com', passwordHash: 'pass' });
    // Tạo incident trước
    const incident = await Incident.create({
      code: 'INC-TEST-001',
      type: 'ACCIDENT', severity: 'LOW',
      location: { type: 'Point', coordinates: [105.8, 21.0], address: 'Test' },
      description: 'Test incident',
      timeline: [{ status: 'PENDING', note: 'Created' }],
    });

    const res = await request(app)
      .patch(`/api/v1/incidents/${incident._id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Báo nhầm' });

    expect(res.status).toBe(200);
    const updated = await Incident.findById(incident._id);
    expect(updated.status).toBe('CANCELLED');
  });

  // TC-02-10
  test('TC-02-10: Public tracking bằng code', async () => {
    const incident = await Incident.create({
      code: 'INC-TRACK-123',
      type: 'ACCIDENT', severity: 'HIGH',
      location: { type: 'Point', coordinates: [105.8, 21.0], address: 'Test' },
      description: 'Test',
      timeline: [{ status: 'PENDING', note: 'Created' }],
    });

    const res = await request(app)
      .get(`/api/v1/incidents/track/${incident.code}`);

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('INC-TRACK-123');
    // Không trả về thông tin nhạy cảm
    expect(res.body.data).not.toHaveProperty('reportedBy');
  });
});
```

### `backend/tests/rescueTeams.test.js`
```js
const request = require('supertest');
const app = require('../src/app');
const RescueTeam = require('../src/models/RescueTeam');
const Incident = require('../src/models/Incident');
const { createAdmin, createDispatcher, createTeam } = require('./helpers');

describe('Rescue Teams API', () => {
  // TC-03-01
  test('TC-03-01: ADMIN tạo rescue team mới', async () => {
    const { token } = await createAdmin({ email: 'admin@test.com', passwordHash: 'pass' });
    const res = await request(app)
      .post('/api/v1/admin/rescue-teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Đội Cứu Hộ Test',
        code: 'TEST-TEAM-01',
        type: 'AMBULANCE',
        zone: 'Hoàn Kiếm',
        coordinates: [105.8412, 21.0245],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Đội Cứu Hộ Test');
    expect(res.body.data.code).toBe('TEST-TEAM-01');
  });

  // TC-03-03
  test('TC-03-03: ADMIN xóa team đang BUSY → 400', async () => {
    const { token } = await createAdmin({ email: 'admin2@test.com', passwordHash: 'pass' });
    const team = await createTeam({ status: 'BUSY' });

    const res = await request(app)
      .delete(`/api/v1/admin/rescue-teams/${team._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('đang xử lý sự cố');
  });

  // TC-03-05
  test('TC-03-05: ADMIN suspend team', async () => {
    const { token } = await createAdmin({ email: 'admin3@test.com', passwordHash: 'pass' });
    const team = await createTeam({ status: 'AVAILABLE' });

    const res = await request(app)
      .patch(`/api/v1/admin/rescue-teams/${team._id}/toggle-suspend`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const updated = await RescueTeam.findById(team._id);
    expect(updated.status).toBe('SUSPENDED');
  });

  // TC-03-07
  test('TC-03-07: DISPATCHER phân công thủ công team cho incident', async () => {
    const { token } = await createDispatcher({ email: 'disp@test.com', passwordHash: 'pass' });
    const team = await createTeam({ status: 'AVAILABLE' });
    const incident = await Incident.create({
      code: 'INC-ASSIGN-001',
      type: 'ACCIDENT', severity: 'HIGH',
      location: { type: 'Point', coordinates: [105.8412, 21.0245], address: 'Test' },
      description: 'Test',
      timeline: [{ status: 'PENDING', note: 'Created' }],
    });

    const res = await request(app)
      .patch(`/api/v1/rescue-teams/${team._id}/assign/${incident._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const updatedIncident = await Incident.findById(incident._id);
    expect(updatedIncident.assignedTeam.toString()).toBe(team._id.toString());
    expect(['ASSIGNED', 'OFFERING']).toContain(updatedIncident.status);
  });

  // TC-03-08
  test('TC-03-08: Phân công team đang BUSY → 400', async () => {
    const { token } = await createDispatcher({ email: 'disp2@test.com', passwordHash: 'pass' });
    const team = await createTeam({ status: 'BUSY' });
    const incident = await Incident.create({
      code: 'INC-BUSY-001',
      type: 'ACCIDENT', severity: 'HIGH',
      location: { type: 'Point', coordinates: [105.8412, 21.0245], address: 'Test' },
      description: 'Test',
      timeline: [{ status: 'PENDING', note: 'Created' }],
    });

    const res = await request(app)
      .patch(`/api/v1/rescue-teams/${team._id}/assign/${incident._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
```

### `backend/tests/reports.test.js`
```js
const request = require('supertest');
const app = require('../src/app');
const Incident = require('../src/models/Incident');
const { createAdmin, createDispatcher } = require('./helpers');

async function seedIncidents() {
  const incidents = [
    { code: 'INC-R01', type: 'ACCIDENT', severity: 'HIGH', status: 'COMPLETED',
      location: { type: 'Point', coordinates: [105.84, 21.02], address: 'A' },
      description: 'Test', completedAt: new Date(), timeline: [] },
    { code: 'INC-R02', type: 'FLOOD', severity: 'LOW', status: 'PENDING',
      location: { type: 'Point', coordinates: [105.85, 21.03], address: 'B' },
      description: 'Test', timeline: [] },
  ];
  await Incident.insertMany(incidents);
}

describe('Reports API', () => {
  beforeEach(seedIncidents);

  // TC-07-01
  test('TC-07-01: GET /reports/summary không filter (ADMIN)', async () => {
    const { token } = await createAdmin({ email: 'admin@test.com', passwordHash: 'pass' });
    const res = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('byStatus');
    expect(res.body.data).toHaveProperty('avgResponseTimeMinutes');
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
  });

  // TC-07-03
  test('TC-07-03: GET /reports/timeline groupBy=day', async () => {
    const { token } = await createDispatcher({ email: 'disp@test.com', passwordHash: 'pass' });
    const res = await request(app)
      .get('/api/v1/reports/timeline?groupBy=day')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // TC-07-04
  test('TC-07-04: GET /reports/heatmap trả về array lat/lng/intensity', async () => {
    const { token } = await createAdmin({ email: 'admin2@test.com', passwordHash: 'pass' });
    const res = await request(app)
      .get('/api/v1/reports/heatmap')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('lat');
      expect(res.body.data[0]).toHaveProperty('lng');
      expect(res.body.data[0]).toHaveProperty('intensity');
    }
  });

  // TC-07-06
  test('TC-07-06: DISPATCHER gọi team-performance → 403', async () => {
    const { token } = await createDispatcher({ email: 'disp2@test.com', passwordHash: 'pass' });
    const res = await request(app)
      .get('/api/v1/reports/team-performance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
```

### `backend/tests/security.test.js`
```js
const request = require('supertest');
const app = require('../src/app');
const { createUser } = require('./helpers');
const jwt = require('jsonwebtoken');

describe('Security', () => {
  // TC-08-03
  test('TC-08-03: JWT bị tamper → 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer this.is.a.fake.jwt.token');

    expect(res.status).toBe(401);
  });

  // TC-08-04
  test('TC-08-04: JWT hết hạn → 401', async () => {
    const { user } = await createUser({ email: 'exp@test.com', passwordHash: 'pass' });
    const expiredToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1ms' }
    );
    // Đợi token hết hạn
    await new Promise(r => setTimeout(r, 10));

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  // TC-08-02
  test('TC-08-02: Input validation — description quá ngắn', async () => {
    const { token } = await createUser({
      email: 'cit@test.com', passwordHash: 'pass', role: 'CITIZEN'
    });
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([105.84, 21.02]))
      .field('description', 'a'); // Quá ngắn

    expect(res.status).toBe(400);
  });
});
```

---

## 8. SCRIPT CHẠY TEST

### Cài đặt dependencies (chạy 1 lần)
```bash
cd backend
npm install --save-dev jest supertest mongodb-memory-server @types/jest
```

### Thêm vào `backend/package.json`
```json
{
  "scripts": {
    "test": "jest --runInBand --forceExit",
    "test:watch": "jest --watch --runInBand",
    "test:coverage": "jest --coverage --runInBand --forceExit"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterFramework": ["./tests/setup.js"],
    "testMatch": ["**/tests/**/*.test.js"],
    "testTimeout": 30000
  }
}
```

### Chạy tất cả test
```bash
cd backend && npm test
```

### Chạy test cụ thể
```bash
cd backend && npm test -- tests/auth.test.js
cd backend && npm test -- tests/incidents.test.js
```

---

## 9. DANH SÁCH ƯU TIÊN SỬA LỖI

### Tuần này (Before Demo):
1. **BUG-01**: Đổi `reportAPI.getDashboard` từ `/admin/dashboard` sang `/reports/summary`
2. **BUG-02**: Thêm role check trong AppContext — chỉ ADMIN mới gọi `fetchConfig`
3. **BUG-03**: Thêm `SUSPENDED` vào `STATUS_META` trong Fleet.jsx
4. **BUG-04**: Thêm `OFFERING` vào `STATUS_LABELS` trong IncidentDetailPanel.jsx
5. **BUG-05**: Thêm `cancel` vào `incidentAPI` trong api.js
6. Chạy tất cả backend tests — đảm bảo pass

### Sprint tiếp theo:
1. **GAP-01**: Cập nhật Reports.jsx dùng Report API thực
2. **GAP-02**: Thêm Notification bell component + `notificationAPI`
3. **GAP-03**: Proxy geo calls qua backend
4. **GAP-04**: Thêm `verifyOTP` vào authAPI
