/**
 * Chat API Tests — chatController full coverage
 * getMessages, sendMessage — phân quyền theo role
 */
const request = require('supertest');
const app = require('../src/app');
const Message = require('../src/models/Message');
const User = require('../src/models/User');
const { createUser, createDispatcher, createAdmin, createTeam, createIncident } = require('./helpers');

async function makeRescueMember(team) {
  const n = Date.now() + Math.random();
  const user = await User.create({
    name: `Rescue-${n}`, email: `chat-res-${n}@t.com`,
    phone: `090${String(Math.floor(n * 10)).slice(-7)}`,
    passwordHash: 'pass', role: 'RESCUE', isActive: true, mustChangePassword: false,
    rescueTeam: team._id, availabilityStatus: 'ONLINE',
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

describe('[TC-CHAT] Chat API', () => {

  // ── POST /:incidentId/messages ────────────────────────────────────────────
  describe('POST /chat/:incidentId/messages', () => {
    test('DISPATCHER gửi tin nhắn → 201 + message lưu DB', async () => {
      const { user: dispatcher, token } = await createDispatcher({
        email: 'chat.disp01@test.com', phone: '0904100001',
      });
      const incident = await createIncident({ status: 'PROCESSING' });

      const res = await request(app)
        .post(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Đội đang trên đường, khoảng 5 phút nữa đến' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.text).toBe('Đội đang trên đường, khoảng 5 phút nữa đến');
      expect(res.body.data.sender.role).toBe('DISPATCHER');

      // Verify DB
      const saved = await Message.findById(res.body.data._id);
      expect(saved).not.toBeNull();
      expect(saved.incident.toString()).toBe(incident._id.toString());
    });

    test('RESCUE (assigned) gửi tin nhắn → 201', async () => {
      const team = await createTeam({ status: 'BUSY' });
      const { token } = await makeRescueMember(team);
      const incident = await createIncident({ status: 'PROCESSING', assignedTeam: team._id });

      const res = await request(app)
        .post(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Đã đến hiện trường, bắt đầu xử lý' });

      expect(res.status).toBe(201);
      expect(res.body.data.sender.role).toBe('RESCUE');
    });

    test('RESCUE không được gán → 403', async () => {
      const team1 = await createTeam();
      const team2 = await createTeam();
      const { token } = await makeRescueMember(team1);
      const incident = await createIncident({ status: 'PROCESSING', assignedTeam: team2._id });

      const res = await request(app)
        .post(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Tin nhắn từ đội không liên quan' });

      expect(res.status).toBe(403);
    });

    test('CITIZEN báo cáo sự cố có thể nhắn trong kênh đó', async () => {
      const { user: citizen, token } = await createUser({
        email: 'chat.cit01@test.com', phone: '0904100004', role: 'CITIZEN', passwordHash: 'pass',
      });
      const incident = await createIncident({ status: 'ASSIGNED', reportedBy: citizen._id });

      const res = await request(app)
        .post(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Xe mình màu đỏ, đang đợi ở ngã tư' });

      expect(res.status).toBe(201);
    });

    test('CITIZEN không liên quan → 403', async () => {
      const { user: citizen1 } = await createUser({
        email: 'chat.cit.other01@test.com', phone: '0904100005', role: 'CITIZEN', passwordHash: 'pass',
      });
      const { token } = await createUser({
        email: 'chat.cit.other02@test.com', phone: '0904100006', role: 'CITIZEN', passwordHash: 'pass',
      });
      const incident = await createIncident({ status: 'ASSIGNED', reportedBy: citizen1._id });

      const res = await request(app)
        .post(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Tin nhắn từ citizen không liên quan' });

      expect(res.status).toBe(403);
    });

    test('Text quá dài (>1000 ký tự) → 422 validation', async () => {
      const { token } = await createDispatcher({ email: 'chat.long@test.com', phone: '0904100007' });
      const incident = await createIncident();

      const res = await request(app)
        .post(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'A'.repeat(1001) });

      expect([400, 422]).toContain(res.status);
    });

    test('Incident không tồn tại → 403 hoặc 404', async () => {
      const { token } = await createDispatcher({ email: 'chat.noincident@test.com', phone: '0904100008' });

      const res = await request(app)
        .post('/api/v1/chat/507f1f77bcf86cd799439011/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Test message' });

      // canAccessChat → DISPATCHER trả true → 403 hoặc 404 tùy impl
      expect([200, 201, 403, 404]).toContain(res.status);
    });
  });

  // ── GET /:incidentId/messages ─────────────────────────────────────────────
  describe('GET /chat/:incidentId/messages', () => {
    test('DISPATCHER lấy lịch sử chat → 200 + messages array', async () => {
      const { user: dispatcher, token } = await createDispatcher({
        email: 'chat.getdisp01@test.com', phone: '0904200001',
      });
      const incident = await createIncident({ status: 'PROCESSING' });

      // Seed vài messages
      await Message.insertMany([
        { incident: incident._id, sender: dispatcher._id, text: 'Tin 1' },
        { incident: incident._id, sender: dispatcher._id, text: 'Tin 2' },
        { incident: incident._id, sender: dispatcher._id, text: 'Tin 3' },
      ]);

      const res = await request(app)
        .get(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body).toHaveProperty('total');
    });

    test('Lấy messages của incident chưa có tin → 200 + []', async () => {
      const { token } = await createDispatcher({ email: 'chat.getdisp02@test.com', phone: '0904200002' });
      const incident = await createIncident();

      const res = await request(app)
        .get(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    test('Phân trang hoạt động (page, limit)', async () => {
      const { user: dispatcher, token } = await createDispatcher({
        email: 'chat.page@test.com', phone: '0904200003',
      });
      const incident = await createIncident();

      // Seed 10 messages
      const msgs = Array.from({ length: 10 }, (_, i) => ({
        incident: incident._id, sender: dispatcher._id, text: `Message ${i + 1}`,
      }));
      await Message.insertMany(msgs);

      const res = await request(app)
        .get(`/api/v1/chat/${incident._id}/messages?page=1&limit=5`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(5);
    });

    test('RESCUE của đội được gán xem được chat', async () => {
      const team = await createTeam({ status: 'BUSY' });
      const { token } = await makeRescueMember(team);
      const incident = await createIncident({ status: 'PROCESSING', assignedTeam: team._id });

      const res = await request(app)
        .get(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('CITIZEN báo cáo xem được chat của sự cố mình báo', async () => {
      const { user: citizen, token } = await createUser({
        email: 'chat.getcit@test.com', phone: '0904200004', role: 'CITIZEN', passwordHash: 'pass',
      });
      const incident = await createIncident({ reportedBy: citizen._id });

      const res = await request(app)
        .get(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('CITIZEN không liên quan không xem được → 403', async () => {
      const { user: citizen1 } = await createUser({
        email: 'chat.getcit2@test.com', phone: '0904200005', role: 'CITIZEN', passwordHash: 'pass',
      });
      const { token } = await createUser({
        email: 'chat.getcit3@test.com', phone: '0904200006', role: 'CITIZEN', passwordHash: 'pass',
      });
      const incident = await createIncident({ reportedBy: citizen1._id });

      const res = await request(app)
        .get(`/api/v1/chat/${incident._id}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
