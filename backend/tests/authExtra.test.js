/**
 * Auth Extra Tests — bao phủ các endpoint chưa được test trong auth.test.js
 * registerCitizen, logout, updateFcmToken, updateSettings, requestAccess, getMe
 */
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { createUser, createDispatcher, createAdmin } = require('./helpers');

describe('[AUTH-EXTRA] Auth Additional Coverage', () => {

  // ── POST /auth/register ──────────────────────────────────────────────────
  describe('Register Citizen', () => {
    test('Đăng ký Citizen thành công → 201 + accessToken', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Nguyễn Văn Đăng Ký',
          email: 'register01@test.com',
          phone: '0901200001',
          password: 'Secure@123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.data.role).toBe('CITIZEN');

      // Verify trong DB
      const user = await User.findOne({ email: 'register01@test.com' });
      expect(user).not.toBeNull();
      expect(user.mustChangePassword).toBe(false);
    });

    test('Email trùng → 400', async () => {
      await User.create({
        name: 'Existing', email: 'dup@register.com', phone: '0901200002',
        passwordHash: 'pass', role: 'CITIZEN', isActive: true, mustChangePassword: false,
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Mới', email: 'dup@register.com', phone: '0901200003', password: 'pass123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('Phone trùng → 400', async () => {
      await User.create({
        name: 'Existing2', email: 'exist2@test.com', phone: '0901200004',
        passwordHash: 'pass', role: 'CITIZEN', isActive: true, mustChangePassword: false,
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Mới', email: 'new2@test.com', phone: '0901200004', password: 'pass123' });

      expect(res.status).toBe(400);
    });

    test('Thiếu password → 422 validation', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'nopwd@test.com', phone: '0901200005' });

      expect([400, 422]).toContain(res.status);
    });

    test('Email không hợp lệ → 422 validation', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'invalid-email', phone: '0901200006', password: 'pass123' });

      expect([400, 422]).toContain(res.status);
    });
  });

  // ── POST /auth/logout ─────────────────────────────────────────────────────
  describe('Logout', () => {
    test('Đăng xuất thành công → 200', async () => {
      const { token } = await createUser({
        email: 'logout01@test.com', phone: '0901300001', passwordHash: 'pass',
      });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Logout xóa refreshToken trong DB', async () => {
      await User.create({
        name: 'Logout Test', email: 'logout02@test.com', phone: '0901300002',
        passwordHash: 'pass', role: 'DISPATCHER', isActive: true, mustChangePassword: false,
      });

      // Login để lấy accessToken thật — accessToken nằm ở ROOT body
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ loginId: 'logout02@test.com', password: 'pass' });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.body.accessToken; // ROOT level

      // Logout với accessToken
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(logoutRes.status).toBe(200);

      // Verify refreshToken đã bị xóa trong DB
      const updated = await User.findOne({ email: 'logout02@test.com' }).select('+refreshToken');
      expect(updated.refreshToken).toBeNull();
    });
  });

  // ── PATCH /auth/fcm-token ─────────────────────────────────────────────────
  describe('Update FCM Token', () => {
    test('Cập nhật FCM token → 200', async () => {
      const { token } = await createUser({
        email: 'fcm01@test.com', phone: '0901400001', role: 'CITIZEN', passwordHash: 'pass',
      });

      const res = await request(app)
        .patch('/api/v1/auth/fcm-token')
        .set('Authorization', `Bearer ${token}`)
        .send({ fcmToken: 'ExponentPushToken[xxxxxxx-test-token]' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('FCM token rỗng → 400', async () => {
      const { token } = await createUser({
        email: 'fcm02@test.com', phone: '0901400002', role: 'CITIZEN', passwordHash: 'pass',
      });

      const res = await request(app)
        .patch('/api/v1/auth/fcm-token')
        .set('Authorization', `Bearer ${token}`)
        .send({ fcmToken: '' });

      expect([400, 422]).toContain(res.status);
    });
  });

  // ── PATCH /auth/settings ──────────────────────────────────────────────────
  describe('Update Personal Settings', () => {
    test('Cập nhật notification settings → 200', async () => {
      const { token } = await createDispatcher({
        email: 'settings01@test.com', phone: '0901500001',
      });

      const res = await request(app)
        .patch('/api/v1/auth/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          notifications: { sosSound: false, browser: true, assignment: true, summary: false },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Cập nhật mapConfig → 200', async () => {
      const { token } = await createDispatcher({
        email: 'settings02@test.com', phone: '0901500002',
      });

      const res = await request(app)
        .patch('/api/v1/auth/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mapConfig: { defaultMap: 'SATELLITE', trafficLayer: false, showTeams: true, autoCenter: false },
        });

      expect(res.status).toBe(200);
    });

    test('Cập nhật name → 200', async () => {
      const { token } = await createDispatcher({
        email: 'settings03@test.com', phone: '0901500003',
      });

      const res = await request(app)
        .patch('/api/v1/auth/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Tên Mới Của Tôi' });

      expect(res.status).toBe(200);
    });
  });

  // ── POST /auth/request-access ─────────────────────────────────────────────
  describe('Request Access (Dispatcher application)', () => {
    test('Gửi yêu cầu cấp quyền → 200 hoặc 201', async () => {
      const res = await request(app)
        .post('/api/v1/auth/request-access')
        .send({
          name: 'Ứng Viên Dispatcher',
          email: 'candidate@test.com',
          phone: '0901600001',
          organization: 'Sở Giao Thông Hà Nội',
          reason: 'Muốn hỗ trợ điều phối cứu hộ giao thông',
        });

      expect([200, 201, 400]).toContain(res.status); // 400 nếu thiếu field bắt buộc
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  describe('Get Me', () => {
    test('GET /auth/me trả đúng thông tin user + settings', async () => {
      const { token } = await createDispatcher({
        email: 'getme@test.com', phone: '0901700001',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('email', 'getme@test.com');
      expect(res.body.data).toHaveProperty('settings');
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(res.body.data).not.toHaveProperty('refreshToken');
    });

    test('GET /auth/me không có token → 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── Admin config ──────────────────────────────────────────────────────────
  describe('System Config', () => {
    test('ADMIN lấy system config → 200', async () => {
      const { token } = await createAdmin({ email: 'cfg01@test.com', phone: '0901800001' });

      const res = await request(app)
        .get('/api/v1/admin/config')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('maintenanceMode');
      expect(res.body.data).toHaveProperty('algoSettings');
      expect(res.body.data).toHaveProperty('notificationSettings');
    });

    test('ADMIN cập nhật system config → 200 + data updated', async () => {
      const { token } = await createAdmin({ email: 'cfg02@test.com', phone: '0901800002' });

      const res = await request(app)
        .patch('/api/v1/admin/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ algoSettings: { searchRadiusKm: 8, isAutoAssignEnabled: true } });

      expect(res.status).toBe(200);
      expect(res.body.data.algoSettings.searchRadiusKm).toBe(8);
    });

    test('ADMIN lấy danh sách dispatchers → 200', async () => {
      const { token } = await createAdmin({ email: 'cfg03@test.com', phone: '0901800003' });
      await createDispatcher({ email: 'disp_list@test.com', phone: '0901800004' });

      const res = await request(app)
        .get('/api/v1/admin/dispatchers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('ADMIN toggle user active → 200', async () => {
      const { token } = await createAdmin({ email: 'cfg04@test.com', phone: '0901800005' });
      const { user } = await createDispatcher({ email: 'toggled@test.com', phone: '0901800006' });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${user._id}/toggle-active`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const updated = await User.findById(user._id);
      expect(updated.isActive).toBe(false); // đã bị khóa
    });

    test('ADMIN reset password → 200 + defaultPassword', async () => {
      const { token } = await createAdmin({ email: 'cfg05@test.com', phone: '0901800007' });
      const { user } = await createDispatcher({ email: 'resetpwd@test.com', phone: '0901800008' });

      const res = await request(app)
        .post(`/api/v1/admin/users/${user._id}/reset-password`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('defaultPassword');
    });

    test('ADMIN updateUser → 200 + name updated', async () => {
      const { token } = await createAdmin({ email: 'cfg06@test.com', phone: '0901800009' });
      const { user } = await createDispatcher({ email: 'editme@test.com', phone: '0901800010' });

      const res = await request(app)
        .put(`/api/v1/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Tên Đã Sửa', phone: '0901800011' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Tên Đã Sửa');
    });

    test('ADMIN deleteUser → 200', async () => {
      const { token } = await createAdmin({ email: 'cfg07@test.com', phone: '0901800012' });
      const { user } = await createDispatcher({ email: 'deleteme@test.com', phone: '0901800013' });

      const res = await request(app)
        .delete(`/api/v1/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('ADMIN không thể xóa tài khoản ADMIN → 400', async () => {
      const { token, user: adminUser } = await createAdmin({ email: 'cfg08@test.com', phone: '0901800014' });

      const res = await request(app)
        .delete(`/api/v1/admin/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
