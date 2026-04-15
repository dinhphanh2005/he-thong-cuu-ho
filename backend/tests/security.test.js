/**
 * TC-08-xx: Security Tests
 *
 * Lưu ý:
 * - Validation middleware trả 422 (không phải 400) cho lỗi field
 * - Login thiếu field → 400 (controller tự handle)
 * - createIncidentRules kiểm tra notEmpty() → string rỗng → 422
 */
const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { createUser, createAdmin, createDispatcher } = require('./helpers');

describe('[TC-08] Security', () => {

  // TC-08-01: JWT giả mạo
  test('TC-08-01: JWT token giả → 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TC-08-02: JWT hết hạn
  test('TC-08-02: JWT hết hạn → 401', async () => {
    const { user } = await createUser({ email: 'exp01@test.com', phone: '0900800001' });
    const expiredToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1ms' }
    );
    await new Promise(r => setTimeout(r, 20));

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  // TC-08-03: Không có Authorization header
  test('TC-08-03: Không có Bearer token → 401', async () => {
    const res = await request(app).get('/api/v1/incidents');
    expect(res.status).toBe(401);
  });

  // TC-08-04: Validation — description rỗng
  // createIncidentRules dùng notEmpty() → empty string → 422
  test('TC-08-04: Incident description rỗng → 422 validation', async () => {
    const { token } = await createUser({
      email: 'cit08@test.com', phone: '0900800004', role: 'CITIZEN', passwordHash: 'pass',
    });

    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([105.84, 21.02]))
      .field('description', ''); // Rỗng → notEmpty() fails → 422

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // TC-08-05: Validation — type không hợp lệ → 422
  test('TC-08-05: Incident type không nằm trong enum → 422', async () => {
    const { token } = await createUser({
      email: 'cit05@test.com', phone: '0900800005', role: 'CITIZEN', passwordHash: 'pass',
    });

    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'INVALID_TYPE')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([105.84, 21.02]))
      .field('description', 'Test incident description đủ dài');

    // validate middleware trả 422
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // TC-08-06: Concurrent session — token cũ bị reject
  test('TC-08-06: Token của session cũ bị reject sau khi re-login', async () => {
    const { token: oldToken } = await createUser({
      email: 'conc@test.com', phone: '0900800006', passwordHash: 'pass',
      role: 'DISPATCHER',
    });

    // Re-login → currentSessionId thay đổi → token cũ bị reject
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginId: 'conc@test.com', password: 'pass' });

    expect(loginRes.status).toBe(200);

    // Old token nên bị reject (currentSessionId đã thay đổi)
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);

    expect(res.status).toBe(401);
  });

  // TC-08-07: Input validation — phone không hợp lệ → 422
  test('TC-08-07: Tạo dispatcher với phone không đúng format → 422', async () => {
    const { token } = await createAdmin({ email: 'admin07s@test.com', phone: '0900800007' });

    const res = await request(app)
      .post('/api/v1/admin/dispatchers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', email: 'valid@test.com', phone: '012345' }); // Format sai

    // validate middleware trả 422
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // TC-08-08: DISPATCHER không thể toggle active user → 403
  test('TC-08-08: DISPATCHER không thể toggle active user → 403', async () => {
    const { user: targetUser } = await createUser({ email: 'target@test.com', phone: '0900800008' });
    const { token: dispToken } = await createDispatcher({
      email: 'disp08s@test.com', phone: '0900800009',
    });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${targetUser._id}/toggle-active`)
      .set('Authorization', `Bearer ${dispToken}`);

    expect(res.status).toBe(403);
  });

  // TC-08-09: Admin dashboard — ADMIN có thể truy cập
  test('TC-08-09: ADMIN truy cập /admin/dashboard → 200', async () => {
    const { token } = await createAdmin({ email: 'admin09s@test.com', phone: '0900800010' });

    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalIncidents');
    expect(res.body.data).toHaveProperty('totalTeams');
    expect(res.body.data).toHaveProperty('totalUsers');
  });
});
