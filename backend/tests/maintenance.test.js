/**
 * TC-MAINT-xx: Kiểm thử chế độ bảo trì hệ thống
 *
 * Kịch bản:
 * - Admin bật maintenanceMode → non-admin nhận 503
 * - Admin vẫn truy cập được bình thường (bypass)
 * - Admin tắt maintenanceMode → tất cả hoạt động trở lại
 *
 * Chạy: npx jest tests/maintenance.test.js --runInBand --verbose
 */

const request = require('supertest');
const app = require('../src/app');
const SystemConfig = require('../src/models/SystemConfig');
const { createAdmin, createDispatcher, createUser } = require('./helpers');

describe('[TC-MAINT] Maintenance Mode', () => {

  // Đảm bảo bảo trì TẮT trước mỗi test
  beforeEach(async () => {
    const cfg = await SystemConfig.getSingleton();
    cfg.maintenanceMode = false;
    await cfg.save();
  });

  // TC-MAINT-01: API bình thường khi không bảo trì
  test('TC-MAINT-01 | Hệ thống hoạt động bình thường khi maintenanceMode=false', async () => {
    const { token } = await createDispatcher({ email: 'disp.m01@test.com', phone: '0900201001' });

    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // TC-MAINT-02: Non-admin bị chặn khi bật bảo trì
  test('TC-MAINT-02 | DISPATCHER bị 503 khi maintenanceMode=true', async () => {
    // Bật bảo trì
    const cfg = await SystemConfig.getSingleton();
    cfg.maintenanceMode = true;
    await cfg.save();

    const { token } = await createDispatcher({ email: 'disp.m02@test.com', phone: '0900201002' });

    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);

    // Phải trả 503 với thông báo bảo trì
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.maintenanceMode).toBe(true);
    expect(res.body.message).toMatch(/bảo trì/i);
  });

  // TC-MAINT-03: CITIZEN bị chặn khi bật bảo trì
  test('TC-MAINT-03 | CITIZEN bị 503 khi maintenanceMode=true', async () => {
    const cfg = await SystemConfig.getSingleton();
    cfg.maintenanceMode = true;
    await cfg.save();

    const { token } = await createUser({
      email: 'cit.m03@test.com', phone: '0900201003', role: 'CITIZEN', passwordHash: 'pass',
    });

    // Citizen cố tạo incident trong khi bảo trì
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([105.84, 21.02]))
      .field('description', 'Test trong khi bảo trì');

    expect(res.status).toBe(503);
    expect(res.body.maintenanceMode).toBe(true);
  });

  // TC-MAINT-04: ADMIN bypass — vẫn truy cập được khi bảo trì
  test('TC-MAINT-04 | ADMIN bypass maintenance → vẫn truy cập API bình thường', async () => {
    // Bật bảo trì
    const cfg = await SystemConfig.getSingleton();
    cfg.maintenanceMode = true;
    await cfg.save();

    const { token } = await createAdmin({ email: 'admin.m04@test.com', phone: '0900201004' });

    // Admin gọi /admin/dashboard — phải 200 dù bảo trì đang BẬT
    const dashRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(dashRes.status).toBe(200);

    // Admin gọi /incidents — phải 200
    const incRes = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);
    expect(incRes.status).toBe(200);
  });

  // TC-MAINT-05: Admin bật bảo trì qua API config
  test('TC-MAINT-05 | Admin bật maintenanceMode qua PATCH /admin/config → 200', async () => {
    const { token } = await createAdmin({ email: 'admin.m05@test.com', phone: '0900201005' });

    const res = await request(app)
      .patch('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ maintenanceMode: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Xác minh DB đã cập nhật
    const updatedCfg = await SystemConfig.getSingleton();
    expect(updatedCfg.maintenanceMode).toBe(true);
  });

  // TC-MAINT-06: Admin tắt bảo trì → hệ thống hoạt động lại
  test('TC-MAINT-06 | Admin tắt maintenanceMode → DISPATCHER truy cập lại bình thường', async () => {
    // Bật bảo trì trước
    const cfg = await SystemConfig.getSingleton();
    cfg.maintenanceMode = true;
    await cfg.save();

    const { token: adminToken } = await createAdmin({ email: 'admin.m06@test.com', phone: '0900201006' });
    const { token: dispToken } = await createDispatcher({ email: 'disp.m06@test.com', phone: '0900201007' });

    // Xác nhận dispatcher bị 503
    const blockedRes = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${dispToken}`);
    expect(blockedRes.status).toBe(503);

    // Admin tắt bảo trì
    await request(app)
      .patch('/api/v1/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maintenanceMode: false });

    // Dispatcher giờ truy cập được
    const okRes = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${dispToken}`);
    expect(okRes.status).toBe(200);
  });

  // TC-MAINT-07: Auth endpoint vẫn hoạt động khi bảo trì (login vẫn được)
  test('TC-MAINT-07 | Login vẫn được khi đang bảo trì (auth routes không bị block)', async () => {
    const cfg = await SystemConfig.getSingleton();
    cfg.maintenanceMode = true;
    await cfg.save();

    // Tạo user trực tiếp (không qua API)
    const User = require('../src/models/User');
    await User.create({
      name: 'Login Test', email: 'login.maint@test.com', phone: '0900201008',
      passwordHash: 'pass123', role: 'DISPATCHER', isActive: true, mustChangePassword: false,
    });

    // Auth route không qua maintenanceMiddleware → vẫn login được
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'login.maint@test.com', password: 'pass123' });

    expect(res.status).toBe(200);
    // accessToken nằm ở ROOT body, không phải trong data
    expect(res.body).toHaveProperty('accessToken');
  });

  // TC-MAINT-08: Retry-After header trong response 503
  test('TC-MAINT-08 | Response 503 có field retryAfter để client biết thời gian chờ', async () => {
    const cfg = await SystemConfig.getSingleton();
    cfg.maintenanceMode = true;
    await cfg.save();

    const { token } = await createDispatcher({ email: 'disp.m08@test.com', phone: '0900201009' });

    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('retryAfter');
    expect(typeof res.body.retryAfter).toBe('number');
  });
});
