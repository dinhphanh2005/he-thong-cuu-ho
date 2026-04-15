/**
 * TC-01-xx: Authentication & Authorization Tests
 *
 * Cấu trúc response login:
 *   { success, accessToken, refreshToken, data: { _id, name, email, phone, role, ... } }
 * Tokens nằm ở ROOT của body, KHÔNG nằm trong data.
 *
 * Validation middleware trả 422 (không phải 400) cho lỗi dữ liệu đầu vào.
 * Login thiếu field trả 400 (controller xử lý trực tiếp, không qua validate middleware).
 */
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { createAdmin, createDispatcher, createUser } = require('./helpers');

describe('[TC-01] Authentication & Authorization', () => {

  // TC-01-01: Login ADMIN với email+password hợp lệ
  test('TC-01-01: Login ADMIN email+password → 200 + tokens', async () => {
    await User.create({
      name: 'Admin Test', email: 'admin01@test.com', phone: '0900000001',
      passwordHash: 'admin123', role: 'ADMIN', isActive: true, mustChangePassword: false,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'admin01@test.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // accessToken và refreshToken nằm ở ROOT body (không phải trong data)
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.length).toBeGreaterThan(20);
    // data chứa thông tin user
    expect(res.body.data.role).toBe('ADMIN');
  });

  // TC-01-02: Login bằng số điện thoại
  test('TC-01-02: Login DISPATCHER bằng số điện thoại → 200', async () => {
    await User.create({
      name: 'Dispatcher', email: 'disp01@test.com', phone: '0901111111',
      passwordHash: 'disp123', role: 'DISPATCHER', isActive: true, mustChangePassword: false,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: '0901111111', password: 'disp123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.data.role).toBe('DISPATCHER');
  });

  // TC-01-03: Login sai password
  test('TC-01-03: Login sai password → 401', async () => {
    await User.create({
      name: 'User', email: 'user01@test.com', phone: '0902222222',
      passwordHash: 'correctpass', role: 'CITIZEN', isActive: true, mustChangePassword: false,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'user01@test.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TC-01-04: Login tài khoản bị khóa
  test('TC-01-04: Login tài khoản isActive=false → 403', async () => {
    await User.create({
      name: 'Locked User', email: 'locked@test.com', phone: '0903333333',
      passwordHash: 'pass123', role: 'DISPATCHER', isActive: false, mustChangePassword: false,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'locked@test.com', password: 'pass123' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // TC-01-05: Refresh token hợp lệ
  test('TC-01-05: Refresh token hợp lệ → 200 + tokens mới', async () => {
    await User.create({
      name: 'Refresh User', email: 'refresh@test.com', phone: '0904444444',
      passwordHash: 'pass123', role: 'DISPATCHER', isActive: true, mustChangePassword: false,
    });

    // Login để lấy refresh token — token nằm ở ROOT body
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'refresh@test.com', password: 'pass123' });

    expect(loginRes.status).toBe(200);
    const refreshToken = loginRes.body.refreshToken; // ROOT level

    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  // TC-01-06: Refresh token không hợp lệ
  test('TC-01-06: Refresh token giả mạo → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken: 'invalid.fake.token' });

    expect(res.status).toBe(401);
  });

  // TC-01-07: DISPATCHER truy cập admin route
  test('TC-01-07: DISPATCHER truy cập /admin/dashboard → 403', async () => {
    const { token } = await createDispatcher({ email: 'disp07@test.com', phone: '0905555555' });

    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  // TC-01-08: CITIZEN truy cập incidents
  test('TC-01-08: CITIZEN truy cập GET /incidents → 403', async () => {
    const { token } = await createUser({
      email: 'cit08@test.com', phone: '0906666666', role: 'CITIZEN', passwordHash: 'pass',
    });

    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  // TC-01-09: Đổi mật khẩu lần đầu
  test('TC-01-09: Change password lần đầu → 200, mustChangePassword=false', async () => {
    const { user, token } = await createDispatcher({
      email: 'newdisp@test.com', phone: '0907777777',
      passwordHash: 'default123', mustChangePassword: true,
    });

    await User.findByIdAndUpdate(user._id, { mustChangePassword: true });

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'NewSecurePass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await User.findById(user._id);
    expect(updated.mustChangePassword).toBe(false);
  });

  // TC-01-10: Không có token → 401
  test('TC-01-10: Không có Bearer token → 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  // TC-01-11: GET /auth/me với token hợp lệ
  test('TC-01-11: GET /auth/me với token hợp lệ → 200 + user info', async () => {
    const { token } = await createAdmin({ email: 'me01@test.com', phone: '0908888888' });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('email');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  // TC-01-12: Login thiếu loginId → validation error
  // loginRules dùng body('loginId').notEmpty() → validate middleware trả 422
  test('TC-01-12: Login thiếu loginId → 422 validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'somepass' }); // Thiếu loginId

    // loginRules chạy trước controller → validate middleware trả 422
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // TC-01-13: ADMIN tạo Dispatcher
  test('TC-01-13: ADMIN tạo tài khoản Dispatcher mới', async () => {
    const { token } = await createAdmin({ email: 'admin13@test.com', phone: '0909999999' });

    const res = await request(app)
      .post('/api/v1/admin/dispatchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dispatcher Mới', email: 'newdisp13@cuuho.vn', phone: '0901000001' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('defaultPassword');
    expect(res.body.data.role).toBe('DISPATCHER');
  });

  // TC-01-14: Tạo Dispatcher với email trùng
  test('TC-01-14: Tạo Dispatcher email trùng → 400', async () => {
    const { token } = await createAdmin({ email: 'admin14@test.com', phone: '0901000002' });
    await User.create({
      name: 'Existing', email: 'dup@cuuho.vn', phone: '0901000003',
      passwordHash: 'pass', role: 'DISPATCHER', isActive: true, mustChangePassword: false,
    });

    const res = await request(app)
      .post('/api/v1/admin/dispatchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dup Dispatcher', email: 'dup@cuuho.vn', phone: '0901000004' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
