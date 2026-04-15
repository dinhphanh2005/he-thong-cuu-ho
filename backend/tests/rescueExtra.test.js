/**
 * Rescue Team Extra Tests — bao phủ updateLocation, updateAvailability,
 * getMyTeam, getTeamById, getActiveTeamsForCitizen
 */
const request = require('supertest');
const app = require('../src/app');
const RescueTeam = require('../src/models/RescueTeam');
const User = require('../src/models/User');
const { createUser, createAdmin, createDispatcher, createTeam } = require('./helpers');

// Tạo RESCUE user với team
async function makeRescueMember(team, opts = {}) {
  const n = Date.now() + Math.random();
  const user = await User.create({
    name: `Rescue-${n}`,
    email: `res-${n}@t.com`,
    phone: `090${String(Math.floor(n * 10)).slice(-7)}`,
    passwordHash: 'pass',
    role: 'RESCUE',
    isActive: true,
    mustChangePassword: false,
    rescueTeam: team._id,
    availabilityStatus: 'ONLINE',
    ...opts,
  });
  team.members.push({ userId: user._id, role: 'MEMBER' });
  await team.save();
  await User.findByIdAndUpdate(user._id, { currentSessionId: `sid-${n}` });

  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: user._id, role: 'RESCUE', sid: `sid-${n}` },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { user, token };
}

describe('[RESCUE-EXTRA] Rescue Team Extra Coverage', () => {

  // ── GET /rescue-teams/my-team ─────────────────────────────────────────────
  describe('GET /rescue-teams/my-team', () => {
    test('RESCUE lấy thông tin đội của mình → 200', async () => {
      const team = await createTeam({ name: 'Đội My-Team Test' });
      const { token } = await makeRescueMember(team);

      const res = await request(app)
        .get('/api/v1/rescue-teams/my-team')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Đội My-Team Test');
      expect(res.body.data).toHaveProperty('onlineMembersCount');
      expect(res.body.data).toHaveProperty('minimumOnlineMembers');
    });

    test('RESCUE có team nhưng team bị xóa → 404 hoặc 200 với data null', async () => {
      // User model yêu cầu rescueTeam cho RESCUE — không thể tạo RESCUE không có team.
      // Test này kiểm tra scenario team bị xóa sau khi user được tạo.
      const tempTeam = await createTeam({ name: 'Đội Sẽ Bị Xóa' });
      const { token } = await makeRescueMember(tempTeam);
      // Xóa team khỏi DB
      await RescueTeam.deleteOne({ _id: tempTeam._id });

      const res = await request(app)
        .get('/api/v1/rescue-teams/my-team')
        .set('Authorization', `Bearer ${token}`);

      // Khi team bị xóa, endpoint trả 200 (team = null từ populate) hoặc 404
      expect([200, 404]).toContain(res.status);
    });

    test('DISPATCHER không truy cập /my-team → 403', async () => {
      const { token } = await createDispatcher({ email: 'disp.myteam@test.com', phone: '0903100002' });

      const res = await request(app)
        .get('/api/v1/rescue-teams/my-team')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /rescue-teams/location (GPS update) ─────────────────────────────
  describe('PATCH /rescue-teams/location', () => {
    test('Rescue cập nhật GPS → 200 + tọa độ mới trong DB', async () => {
      const team = await createTeam({ status: 'AVAILABLE' });
      const { token } = await makeRescueMember(team);
      const newCoords = [105.8700, 21.0500];

      const res = await request(app)
        .patch('/api/v1/rescue-teams/location')
        .set('Authorization', `Bearer ${token}`)
        .send({ coordinates: newCoords });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coordinates).toEqual(newCoords);

      const updated = await RescueTeam.findById(team._id);
      expect(updated.currentLocation.coordinates[0]).toBeCloseTo(newCoords[0], 3);
      expect(updated.currentLocation.coordinates[1]).toBeCloseTo(newCoords[1], 3);
      expect(updated.lastLocationUpdate).toBeDefined();
    });

    test('DISPATCHER không thể cập nhật GPS → 403', async () => {
      const { token } = await createDispatcher({ email: 'disp.gps@test.com', phone: '0903200001' });

      const res = await request(app)
        .patch('/api/v1/rescue-teams/location')
        .set('Authorization', `Bearer ${token}`)
        .send({ coordinates: [105.84, 21.02] });

      expect(res.status).toBe(403);
    });

    test('Thiếu coordinates → 422 validation', async () => {
      const team = await createTeam();
      const { token } = await makeRescueMember(team);

      const res = await request(app)
        .patch('/api/v1/rescue-teams/location')
        .set('Authorization', `Bearer ${token}`)
        .send({}); // Không có coordinates

      expect([400, 422]).toContain(res.status);
    });
  });

  // ── PATCH /rescue-teams/availability ─────────────────────────────────────
  describe('PATCH /rescue-teams/availability', () => {
    test('Rescue báo OFFLINE → 200 + team status cập nhật', async () => {
      const team = await createTeam({ status: 'AVAILABLE' });
      const { token } = await makeRescueMember(team);

      const res = await request(app)
        .patch('/api/v1/rescue-teams/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'OFFLINE' });

      expect(res.status).toBe(200);
      expect(res.body.data.availabilityStatus).toBe('OFFLINE');
      expect(res.body.data).toHaveProperty('teamStatus');
      expect(res.body.data).toHaveProperty('onlineMembersCount');
    });

    test('Rescue báo ONLINE → 200', async () => {
      const team = await createTeam({ status: 'OFFLINE' });
      const { user, token } = await makeRescueMember(team, { availabilityStatus: 'OFFLINE' });

      const res = await request(app)
        .patch('/api/v1/rescue-teams/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ONLINE' });

      expect(res.status).toBe(200);
      expect(res.body.data.availabilityStatus).toBe('ONLINE');
    });

    test('Status không hợp lệ → 400', async () => {
      const team = await createTeam();
      const { token } = await makeRescueMember(team);

      const res = await request(app)
        .patch('/api/v1/rescue-teams/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'BUSY' }); // Không được phép đặt BUSY trực tiếp

      expect(res.status).toBe(400);
    });
  });

  // ── GET /rescue-teams/:id (team detail) ───────────────────────────────────
  describe('GET /rescue-teams/:id', () => {
    test('DISPATCHER xem chi tiết team → 200 + members', async () => {
      const { token } = await createDispatcher({ email: 'disp.teamid@test.com', phone: '0903300001' });
      const team = await createTeam({ name: 'Đội Detail Test' });

      const res = await request(app)
        .get(`/api/v1/rescue-teams/${team._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Đội Detail Test');
      expect(res.body.data).toHaveProperty('members');
    });

    test('Team không tồn tại → 404', async () => {
      const { token } = await createDispatcher({ email: 'disp.notfound@test.com', phone: '0903300002' });

      const res = await request(app)
        .get('/api/v1/rescue-teams/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    test('RESCUE chỉ xem được đội của mình', async () => {
      const myTeam = await createTeam({ name: 'Đội Của Tôi' });
      const otherTeam = await createTeam({ name: 'Đội Khác' });
      const { token } = await makeRescueMember(myTeam);

      // Xem đội của mình → 200
      const res1 = await request(app)
        .get(`/api/v1/rescue-teams/${myTeam._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res1.status).toBe(200);

      // Xem đội khác → 403
      const res2 = await request(app)
        .get(`/api/v1/rescue-teams/${otherTeam._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(403);
    });
  });

  // ── GET /rescue-teams/ (all teams — Dispatcher) ───────────────────────────
  describe('GET /rescue-teams/', () => {
    test('DISPATCHER lấy tất cả teams → 200 + array', async () => {
      const { token } = await createDispatcher({ email: 'disp.allteam@test.com', phone: '0903400001' });
      await createTeam({ status: 'AVAILABLE' });
      await createTeam({ status: 'OFFLINE' });

      const res = await request(app)
        .get('/api/v1/rescue-teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('CITIZEN không thể lấy danh sách teams → 403', async () => {
      const { token } = await createUser({
        email: 'cit.teams@test.com', phone: '0903400002', role: 'CITIZEN', passwordHash: 'pass',
      });

      const res = await request(app)
        .get('/api/v1/rescue-teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /rescue-teams/active ──────────────────────────────────────────────
  describe('GET /rescue-teams/active', () => {
    test('Lấy danh sách teams AVAILABLE gần tọa độ → 200', async () => {
      await createTeam({ status: 'AVAILABLE', currentLocation: { type: 'Point', coordinates: [105.84, 21.02] } });
      const { token } = await createUser({
        email: 'cit.active@test.com', phone: '0903500001', role: 'CITIZEN', passwordHash: 'pass',
      });

      const res = await request(app)
        .get('/api/v1/rescue-teams/active?lat=21.02&lng=105.84')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Thiếu lat/lng → 400', async () => {
      const { token } = await createUser({
        email: 'cit.nolatlng@test.com', phone: '0903500002', role: 'CITIZEN', passwordHash: 'pass',
      });

      const res = await request(app)
        .get('/api/v1/rescue-teams/active')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  // ── ADMIN rescue member management ────────────────────────────────────────
  describe('Admin Rescue Member', () => {
    test('ADMIN tạo rescue member → 201 + defaultPassword', async () => {
      const { token } = await createAdmin({ email: 'admin.member@test.com', phone: '0903600001' });
      const team = await createTeam();

      const n = Date.now();
      const res = await request(app)
        .post('/api/v1/admin/rescue-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Nguyễn Cứu Hộ',
          email: `member-${n}@cuuho.vn`,
          phone: `090${String(n).slice(-7)}`,
          teamId: team._id.toString(),
          memberRole: 'DRIVER',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('defaultPassword');
      expect(res.body.data.teamName).toBe(team.name);
    });

    test('Tạo member cho team không tồn tại → 404', async () => {
      const { token } = await createAdmin({ email: 'admin.member2@test.com', phone: '0903600002' });
      const n = Date.now();

      const res = await request(app)
        .post('/api/v1/admin/rescue-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          email: `noTeam-${n}@test.com`,
          phone: `091${String(n).slice(-7)}`,
          teamId: '507f1f77bcf86cd799439011',
        });

      expect(res.status).toBe(404);
    });
  });
});
