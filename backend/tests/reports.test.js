/**
 * TC-07-xx: Reports API Tests
 */
const request = require('supertest');
const app = require('../src/app');
const Incident = require('../src/models/Incident');
const RescueTeam = require('../src/models/RescueTeam');
const { createAdmin, createDispatcher } = require('./helpers');

async function seedData() {
  // Tạo một số incidents với trạng thái khác nhau
  const now = new Date();
  await Incident.insertMany([
    {
      code: 'INC-R-001', type: 'ACCIDENT', severity: 'HIGH', status: 'COMPLETED',
      location: { type: 'Point', coordinates: [105.84, 21.02], address: 'Hà Nội' },
      description: 'Test accident', completedAt: now,
      timeline: [{ status: 'COMPLETED', note: 'Done' }],
    },
    {
      code: 'INC-R-002', type: 'FLOOD', severity: 'LOW', status: 'PENDING',
      location: { type: 'Point', coordinates: [105.85, 21.03], address: 'Hà Nội 2' },
      description: 'Test flood',
      timeline: [{ status: 'PENDING', note: 'Created' }],
    },
    {
      code: 'INC-R-003', type: 'FIRE', severity: 'CRITICAL', status: 'PROCESSING',
      location: { type: 'Point', coordinates: [105.83, 21.01], address: 'Hà Nội 3' },
      description: 'Test fire',
      timeline: [{ status: 'PROCESSING', note: 'In progress' }],
    },
  ]);
}

describe('[TC-07] Reports API', () => {
  beforeEach(seedData);

  // TC-07-01: Summary không filter
  test('TC-07-01: GET /reports/summary không filter → 200 + full stats', async () => {
    const { token } = await createAdmin({ email: 'admin01r@test.com', phone: '0900700001' });

    const res = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('byStatus');
    expect(res.body.data).toHaveProperty('byType');
    expect(res.body.data).toHaveProperty('avgResponseTimeMinutes');
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
  });

  // TC-07-02: Summary với date range
  test('TC-07-02: GET /reports/summary với from/to date → 200 + filtered', async () => {
    const { token } = await createAdmin({ email: 'admin02r@test.com', phone: '0900700002' });
    const from = new Date();
    from.setDate(from.getDate() - 1); // Hôm qua
    const to = new Date();
    to.setDate(to.getDate() + 1); // Ngày mai

    const res = await request(app)
      .get(`/api/v1/reports/summary?from=${from.toISOString()}&to=${to.toISOString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
  });

  // TC-07-03: Timeline groupBy day
  test('TC-07-03: GET /reports/timeline groupBy=day → 200 + array', async () => {
    const { token } = await createDispatcher({ email: 'disp03r@test.com', phone: '0900700003' });

    const res = await request(app)
      .get('/api/v1/reports/timeline?groupBy=day')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('_id');
      expect(res.body.data[0]).toHaveProperty('total');
      expect(res.body.data[0]).toHaveProperty('completed');
    }
  });

  // TC-07-04: Timeline groupBy month
  test('TC-07-04: GET /reports/timeline groupBy=month → 200', async () => {
    const { token } = await createDispatcher({ email: 'disp04r@test.com', phone: '0900700004' });

    const res = await request(app)
      .get('/api/v1/reports/timeline?groupBy=month')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // TC-07-05: Heatmap data
  test('TC-07-05: GET /reports/heatmap → 200 + [{lat, lng, intensity}]', async () => {
    const { token } = await createAdmin({ email: 'admin05r@test.com', phone: '0900700005' });

    const res = await request(app)
      .get('/api/v1/reports/heatmap')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    const first = res.body.data[0];
    expect(first).toHaveProperty('lat');
    expect(first).toHaveProperty('lng');
    expect(first).toHaveProperty('intensity');
    expect(first.intensity).toBeGreaterThan(0);
    expect(first.intensity).toBeLessThanOrEqual(1);
  });

  // TC-07-06: Team performance (ADMIN only)
  test('TC-07-06: GET /reports/team-performance ADMIN → 200', async () => {
    const { token } = await createAdmin({ email: 'admin06r@test.com', phone: '0900700006' });

    const res = await request(app)
      .get('/api/v1/reports/team-performance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // TC-07-07: DISPATCHER gọi team-performance → 403
  test('TC-07-07: DISPATCHER gọi team-performance → 403', async () => {
    const { token } = await createDispatcher({ email: 'disp07r@test.com', phone: '0900700007' });

    const res = await request(app)
      .get('/api/v1/reports/team-performance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  // TC-07-08: Heatmap filter theo type
  test('TC-07-08: Heatmap filter theo type=ACCIDENT → chỉ trả về ACCIDENT', async () => {
    const { token } = await createAdmin({ email: 'admin08r@test.com', phone: '0900700008' });

    const res = await request(app)
      .get('/api/v1/reports/heatmap?type=ACCIDENT')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(item => {
      expect(item.type).toBe('ACCIDENT');
    });
  });

  // TC-07-09: Summary sosCount
  test('TC-07-09: Summary đếm đúng sosCount', async () => {
    const { token } = await createAdmin({ email: 'admin09r@test.com', phone: '0900700009' });
    // Tạo SOS incident
    await Incident.create({
      code: 'SOS-001', type: 'OTHER', severity: 'CRITICAL', status: 'PENDING',
      location: { type: 'Point', coordinates: [105.84, 21.02], address: 'SOS' },
      description: 'SOS test emergency', timeline: [],
    });

    const res = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sosCount).toBeGreaterThanOrEqual(1);
  });
});
