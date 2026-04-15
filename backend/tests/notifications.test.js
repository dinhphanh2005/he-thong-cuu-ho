/**
 * TC-06-xx: Notifications API Tests
 */
const request = require('supertest');
const app = require('../src/app');
const Notification = require('../src/models/Notification');
const { createUser, createAdmin, createDispatcher } = require('./helpers');

async function seedNotifications(userId, count = 3) {
  const Incident = require('../src/models/Incident');
  const incident = await Incident.create({
    code: `INC-NOTI-${Date.now()}`,
    type: 'ACCIDENT', severity: 'HIGH', status: 'PENDING',
    location: { type: 'Point', coordinates: [105.84, 21.02], address: 'Test' },
    description: 'Test notification incident',
    timeline: [],
  });

  const notifs = [];
  for (let i = 0; i < count; i++) {
    notifs.push({
      recipient: userId,
      type: 'INCIDENT_ASSIGNED',
      title: `Thông báo ${i + 1}`,
      body: `Nội dung thông báo ${i + 1}`,
      incident: incident._id,
      isRead: i === 0, // Chỉ cái đầu đã đọc
    });
  }
  await Notification.insertMany(notifs);
  return incident;
}

describe('[TC-06] Notifications API', () => {

  // TC-06-01: Lấy notifications
  test('TC-06-01: Lấy danh sách notifications → 200 + unreadCount', async () => {
    const { user, token } = await createDispatcher({ email: 'disp01n@test.com', phone: '0900600001' });
    await seedNotifications(user._id, 3);

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('unreadCount');
    expect(res.body.unreadCount).toBe(2); // 2 chưa đọc
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
  });

  // TC-06-02: Filter unreadOnly
  test('TC-06-02: Filter unreadOnly=true → chỉ trả về chưa đọc', async () => {
    const { user, token } = await createDispatcher({ email: 'disp02n@test.com', phone: '0900600002' });
    await seedNotifications(user._id, 3);

    const res = await request(app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(n => expect(n.isRead).toBe(false));
  });

  // TC-06-03: Mark một notification đã đọc
  // Lưu ý: seedNotifications(userId, 1) tạo 1 notif với isRead=true (i===0).
  // Dùng count=3 để đảm bảo có notif với isRead=false (i=1,2).
  test('TC-06-03: Mark notification đã đọc → 200 + isRead=true', async () => {
    const { user, token } = await createDispatcher({ email: 'disp03n@test.com', phone: '0900600003' });
    await seedNotifications(user._id, 3); // notif[0]=read, notif[1,2]=unread
    const notif = await Notification.findOne({ recipient: user._id, isRead: false });

    // notif không null vì có 2 notifications chưa đọc (index 1 và 2)
    expect(notif).not.toBeNull();

    const res = await request(app)
      .patch(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  // TC-06-04: Mark all read
  test('TC-06-04: Mark all read → 200, unreadCount = 0', async () => {
    const { user, token } = await createDispatcher({ email: 'disp04n@test.com', phone: '0900600004' });
    await seedNotifications(user._id, 5);

    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify tất cả đã đọc
    const unread = await Notification.countDocuments({ recipient: user._id, isRead: false });
    expect(unread).toBe(0);
  });

  // TC-06-05: Notification thuộc user khác → 404
  test('TC-06-05: Mark notification của user khác → 404', async () => {
    const { user: otherUser } = await createUser({ email: 'other@test.com', phone: '0900600005' });
    const { token } = await createDispatcher({ email: 'disp05n@test.com', phone: '0900600006' });
    await seedNotifications(otherUser._id, 1);
    const otherNotif = await Notification.findOne({ recipient: otherUser._id });

    const res = await request(app)
      .patch(`/api/v1/notifications/${otherNotif._id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  // TC-06-06: Cleanup old notifications
  test('TC-06-06: Cleanup notifications cũ đã đọc → 200 + count', async () => {
    const { user, token } = await createDispatcher({ email: 'disp06n@test.com', phone: '0900600007' });

    // Tạo notification cũ 31 ngày
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    await Notification.create({
      recipient: user._id,
      type: 'INCIDENT_ASSIGNED',
      title: 'Old',
      body: 'Old notification',
      isRead: true,
      createdAt: oldDate,
    });

    const res = await request(app)
      .delete('/api/v1/notifications/cleanup')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Đã xóa \d+/);
  });
});
