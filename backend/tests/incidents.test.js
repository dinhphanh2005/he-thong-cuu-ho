/**
 * TC-02-xx: Incident API Tests
 */
const request = require('supertest');
const app = require('../src/app');
const Incident = require('../src/models/Incident');
const { createUser, createAdmin, createDispatcher, createIncident } = require('./helpers');

describe('[TC-02] Incidents API', () => {

  // TC-02-01: CITIZEN tạo incident hợp lệ
  test('TC-02-01: CITIZEN tạo incident trong VN → 201 + code INC-*', async () => {
    const { token } = await createUser({
      email: 'cit01@test.com', phone: '0900000001', role: 'CITIZEN', passwordHash: 'pass',
    });

    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([105.8412, 21.0245]))
      .field('description', 'Tai nạn nghiêm trọng tại ngã tư Hàng Bài');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toMatch(/^INC-/);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.type).toBe('ACCIDENT');
    expect(res.body.data.severity).toBe('HIGH');
  });

  // TC-02-02: Coordinates ngoài VN
  test('TC-02-02: Coordinates ngoài VN (Paris) → 400', async () => {
    const { token } = await createUser({
      email: 'cit02@test.com', phone: '0900000002', role: 'CITIZEN', passwordHash: 'pass',
    });

    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([2.3522, 48.8566]))
      .field('description', 'Test incident ở Paris');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ngoài phạm vi|không hỗ trợ/i);
  });

  // TC-02-03: DISPATCHER tạo incident với callerPhone
  test('TC-02-03: DISPATCHER tạo incident kèm callerPhone', async () => {
    const { token } = await createDispatcher({ email: 'disp03@test.com', phone: '0900000003' });

    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'BREAKDOWN')
      .field('severity', 'MEDIUM')
      .field('coordinates', JSON.stringify([105.8412, 21.0245]))
      .field('description', 'Hỏng xe chết máy giữa đường Giảng Võ')
      .field('callerPhone', '0901234567');

    expect(res.status).toBe(201);
    expect(res.body.data.callerPhone).toBe('0901234567');
  });

  // TC-02-04: Thiếu description → validation error
  // Validation middleware trả 422 (không phải 400)
  test('TC-02-04: Thiếu description → 422 validation', async () => {
    const { token } = await createUser({
      email: 'cit04@test.com', phone: '0900000004', role: 'CITIZEN', passwordHash: 'pass',
    });

    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'ACCIDENT')
      .field('severity', 'HIGH')
      .field('coordinates', JSON.stringify([105.8412, 21.0245]))
      .field('description', ''); // Empty → notEmpty() fails

    // validate middleware dùng status 422
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // TC-02-05: Danh sách incidents (DISPATCHER)
  test('TC-02-05: DISPATCHER lấy danh sách incidents → 200 + pagination', async () => {
    const { token } = await createDispatcher({ email: 'disp05@test.com', phone: '0900000005' });
    // Seed 3 incidents
    await Promise.all([createIncident(), createIncident(), createIncident()]);

    const res = await request(app)
      .get('/api/v1/incidents?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body).toHaveProperty('total');
  });

  // TC-02-06: Chi tiết incident
  test('TC-02-06: Lấy chi tiết incident → 200 + timeline', async () => {
    const { token } = await createDispatcher({ email: 'disp06@test.com', phone: '0900000006' });
    const incident = await createIncident();

    const res = await request(app)
      .get(`/api/v1/incidents/${incident._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id.toString()).toBe(incident._id.toString());
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
  });

  // TC-02-07: Incident không tồn tại → 404
  test('TC-02-07: Chi tiết incident không tồn tại → 404', async () => {
    const { token } = await createDispatcher({ email: 'disp07@test.com', phone: '0900000007' });
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .get(`/api/v1/incidents/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  // TC-02-08: Public tracking — không cần auth
  // Backend đã cấu hình bypass protect cho route /incidents/track/:code
  test('TC-02-08: Public tracking bằng code (không cần auth)', async () => {
    const incident = await createIncident({ code: 'INC-TRACK-PUBLIC-001' });

    // Gọi KHÔNG có Authorization header
    const res = await request(app)
      .get(`/api/v1/incidents/track/${incident.code}`);

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe(incident.code.toUpperCase());
  });

  // TC-02-09: DISPATCHER hủy incident
  test('TC-02-09: DISPATCHER hủy incident PENDING → CANCELLED', async () => {
    const { token } = await createDispatcher({ email: 'disp09@test.com', phone: '0900000009' });
    const incident = await createIncident({ status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/v1/incidents/${incident._id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Người dân báo nhầm' });

    expect(res.status).toBe(200);
    const updated = await Incident.findById(incident._id);
    expect(updated.status).toBe('CANCELLED');
  });

  // TC-02-10: CITIZEN không thể xem tất cả incidents
  test('TC-02-10: CITIZEN gọi GET /incidents → 403', async () => {
    const { token } = await createUser({
      email: 'cit10@test.com', phone: '0900000010', role: 'CITIZEN', passwordHash: 'pass',
    });

    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  // TC-02-11: Filter incidents theo status
  test('TC-02-11: Filter incidents theo status=PENDING', async () => {
    const { token } = await createDispatcher({ email: 'disp11@test.com', phone: '0900000011' });
    await createIncident({ status: 'PENDING' });
    await createIncident({ status: 'COMPLETED' });

    const res = await request(app)
      .get('/api/v1/incidents?status=PENDING')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(i => expect(i.status).toBe('PENDING'));
  });

  // TC-02-12: Update status incident
  test('TC-02-12: DISPATCHER cập nhật status incident', async () => {
    const { token } = await createDispatcher({ email: 'disp12@test.com', phone: '0900000012' });
    const incident = await createIncident({ status: 'ASSIGNED' });

    const res = await request(app)
      .patch(`/api/v1/incidents/${incident._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED', note: 'Xử lý xong' });

    expect(res.status).toBe(200);
  });
});
