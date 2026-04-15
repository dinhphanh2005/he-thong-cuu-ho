const User = require('../src/models/User');
const RescueTeam = require('../src/models/RescueTeam');
const Incident = require('../src/models/Incident');
const jwt = require('jsonwebtoken');

let counter = 0;
function nextId() { return ++counter; }

/**
 * Tạo user, hash password, và return JWT token
 */
const createUser = async (overrides = {}) => {
  const id = nextId();
  const defaults = {
    name: `Test User ${id}`,
    email: `user${id}@test.com`,
    phone: `090${String(id).padStart(7, '0')}`,
    passwordHash: 'testpass123',
    role: 'CITIZEN',
    isActive: true,
    mustChangePassword: false,
  };
  const data = { ...defaults, ...overrides };
  const user = await User.create(data);

  const sessionId = `test-session-${id}`;
  user.currentSessionId = sessionId;
  await User.findByIdAndUpdate(user._id, { currentSessionId: sessionId });

  const token = jwt.sign(
    { id: user._id, role: user.role, sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { user, token };
};

const createAdmin = (overrides = {}) =>
  createUser({ role: 'ADMIN', mustChangePassword: false, ...overrides });

const createDispatcher = (overrides = {}) =>
  createUser({ role: 'DISPATCHER', mustChangePassword: false, ...overrides });

const createRescueMember = async (teamId, overrides = {}) => {
  const id = nextId();
  return createUser({
    role: 'RESCUE',
    email: `rescue${id}@test.com`,
    phone: `091${String(id).padStart(7, '0')}`,
    rescueTeam: teamId,
    availabilityStatus: 'ONLINE',
    ...overrides,
  });
};

/**
 * Tạo RescueTeam với GPS Hà Nội
 */
const createTeam = async (overrides = {}) => {
  const id = nextId();
  const defaults = {
    name: `Đội Test ${id}`,
    code: `TEAM-${id}`,
    type: 'AMBULANCE',
    zone: 'Hoàn Kiếm',
    status: 'AVAILABLE',
    currentLocation: { type: 'Point', coordinates: [105.8412, 21.0245] },
    lastLocationUpdate: new Date(),
    members: [],
  };
  return RescueTeam.create({ ...defaults, ...overrides });
};

/**
 * Tạo Incident mẫu
 */
const createIncident = async (overrides = {}) => {
  const id = nextId();
  const defaults = {
    code: `INC-TEST-${Date.now()}-${id}`,
    type: 'ACCIDENT',
    severity: 'HIGH',
    status: 'PENDING',
    location: {
      type: 'Point',
      coordinates: [105.8412, 21.0245],
      address: 'Test Address, Hoàn Kiếm, Hà Nội',
    },
    description: 'Test incident description đủ dài để pass validation',
    timeline: [{ status: 'PENDING', note: 'Tạo test' }],
  };
  return Incident.create({ ...defaults, ...overrides });
};

module.exports = { createUser, createAdmin, createDispatcher, createRescueMember, createTeam, createIncident };
