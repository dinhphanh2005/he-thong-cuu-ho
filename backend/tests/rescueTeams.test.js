/**
 * TC-03-xx: Rescue Teams API Tests
 */
const request = require('supertest');
const app = require('../src/app');
const RescueTeam = require('../src/models/RescueTeam');
const User = require('../src/models/User');
const { createAdmin, createDispatcher, createTeam, createIncident } = require('./helpers');

/**
 * assignTeamToIncident gọi recalculateTeamStatus → cần team có ≥ MIN_ONLINE_MEMBERS (=2)
 * thành viên với availabilityStatus='ONLINE'. Hàm này tạo team đủ điều kiện assign.
 */
async function createAssignableTeam(overrides = {}) {
  const n = Date.now();
  const team = await createTeam({ status: 'AVAILABLE', ...overrides });

  // Tạo 2 user RESCUE ONLINE gắn vào team
  const m1 = await User.create({
    name: `M1-${n}`, email: `m1-${n}@t.com`, phone: `090${String(n).slice(-7)}`,
    passwordHash: 'pass', role: 'RESCUE', isActive: true, mustChangePassword: false,
    rescueTeam: team._id, availabilityStatus: 'ONLINE',
  });
  const m2 = await User.create({
    name: `M2-${n}`, email: `m2-${n}@t.com`, phone: `091${String(n).slice(-7)}`,
    passwordHash: 'pass', role: 'RESCUE', isActive: true, mustChangePassword: false,
    rescueTeam: team._id, availabilityStatus: 'ONLINE',
  });

  team.members = [
    { userId: m1._id, role: 'LEADER' },
    { userId: m2._id, role: 'DRIVER' },
  ];
  team.status = 'AVAILABLE';
  await team.save();
  return team;
}

describe('[TC-03] Rescue Teams API', () => {

  // TC-03-01: Tạo rescue team
  test('TC-03-01: ADMIN tạo rescue team mới → 201', async () => {
    const { token } = await createAdmin({ email: 'admin01@test.com', phone: '0900100001' });

    const res = await request(app)
      .post('/api/v1/admin/rescue-teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Đội Cứu Hộ Hoàn Kiếm 01',
        code: 'RESCUE-HK-01',
        type: 'AMBULANCE',
        zone: 'Hoàn Kiếm',
        coordinates: [105.8412, 21.0245],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Đội Cứu Hộ Hoàn Kiếm 01');
    expect(res.body.data.code).toBe('RESCUE-HK-01');
    expect(res.body.data.type).toBe('AMBULANCE');
  });

  // TC-03-02: Tạo team với code trùng
  test('TC-03-02: Tạo team với code trùng → 400/500', async () => {
    const { token } = await createAdmin({ email: 'admin02@test.com', phone: '0900100002' });
    await createTeam({ code: 'DUP-CODE-01' });

    const res = await request(app)
      .post('/api/v1/admin/rescue-teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Team Khác', code: 'DUP-CODE-01',
        type: 'FIRE', coordinates: [105.8412, 21.0245],
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // TC-03-03: Cập nhật team
  test('TC-03-03: ADMIN cập nhật tên/zone rescue team → 200', async () => {
    const { token } = await createAdmin({ email: 'admin03@test.com', phone: '0900100003' });
    const team = await createTeam();

    const res = await request(app)
      .put(`/api/v1/admin/rescue-teams/${team._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tên Đội Cập Nhật', zone: 'Cầu Giấy' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Tên Đội Cập Nhật');
    expect(res.body.data.zone).toBe('Cầu Giấy');
  });

  // TC-03-04: Xóa team đang BUSY
  test('TC-03-04: Xóa team đang BUSY → 400', async () => {
    const { token } = await createAdmin({ email: 'admin04@test.com', phone: '0900100004' });
    const team = await createTeam({ status: 'BUSY' });

    const res = await request(app)
      .delete(`/api/v1/admin/rescue-teams/${team._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/đang xử lý sự cố|không thể xóa/i);
  });

  // TC-03-05: Xóa team OFFLINE
  test('TC-03-05: Xóa team OFFLINE → 200', async () => {
    const { token } = await createAdmin({ email: 'admin05@test.com', phone: '0900100005' });
    const team = await createTeam({ status: 'OFFLINE' });

    const res = await request(app)
      .delete(`/api/v1/admin/rescue-teams/${team._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const deleted = await RescueTeam.findById(team._id);
    expect(deleted).toBeNull();
  });

  // TC-03-06: Suspend team
  test('TC-03-06: ADMIN suspend team AVAILABLE → SUSPENDED', async () => {
    const { token } = await createAdmin({ email: 'admin06@test.com', phone: '0900100006' });
    const team = await createTeam({ status: 'AVAILABLE' });

    const res = await request(app)
      .patch(`/api/v1/admin/rescue-teams/${team._id}/toggle-suspend`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const updated = await RescueTeam.findById(team._id);
    expect(updated.status).toBe('SUSPENDED');
  });

  // TC-03-07: Un-suspend team
  test('TC-03-07: ADMIN un-suspend team SUSPENDED → OFFLINE/AVAILABLE', async () => {
    const { token } = await createAdmin({ email: 'admin07@test.com', phone: '0900100007' });
    const team = await createTeam({ status: 'SUSPENDED' });

    const res = await request(app)
      .patch(`/api/v1/admin/rescue-teams/${team._id}/toggle-suspend`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const updated = await RescueTeam.findById(team._id);
    expect(updated.status).not.toBe('SUSPENDED');
  });

  // TC-03-08: DISPATCHER phân công thủ công
  // Lưu ý: assignTeamToIncident gọi recalculateTeamStatus → cần ≥2 member ONLINE
  test('TC-03-08: DISPATCHER phân công team AVAILABLE cho incident PENDING → 200', async () => {
    const { token } = await createDispatcher({ email: 'disp08@test.com', phone: '0900100008' });
    const team = await createAssignableTeam(); // Team có 2 member ONLINE
    const incident = await createIncident({ status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/v1/rescue-teams/${team._id}/assign/${incident._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  // TC-03-09: Phân công team BUSY
  test('TC-03-09: Phân công team đang BUSY → 400', async () => {
    const { token } = await createDispatcher({ email: 'disp09@test.com', phone: '0900100009' });
    const team = await createTeam({ status: 'BUSY' });
    const incident = await createIncident({ status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/v1/rescue-teams/${team._id}/assign/${incident._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  // TC-03-10: Danh sách teams (DISPATCHER)
  test('TC-03-10: DISPATCHER lấy danh sách tất cả teams → 200', async () => {
    const { token } = await createDispatcher({ email: 'disp10@test.com', phone: '0900100010' });
    await createTeam();
    await createTeam();

    const res = await request(app)
      .get('/api/v1/rescue-teams')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  // TC-03-11: ADMIN lấy lịch sử team
  test('TC-03-11: ADMIN lấy lịch sử incident của team → 200', async () => {
    const { token } = await createAdmin({ email: 'admin11@test.com', phone: '0900100011' });
    const team = await createTeam();

    const res = await request(app)
      .get(`/api/v1/admin/rescue-teams/${team._id}/history`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
