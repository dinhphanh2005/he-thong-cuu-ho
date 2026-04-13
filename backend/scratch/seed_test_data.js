require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const RescueTeam = require('../src/models/RescueTeam');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB Connected');

  // Create a Rescue Team
  let team = await RescueTeam.findOne({ code: 'TEST_TEAM_01' });
  if (!team) {
    team = await RescueTeam.create({
      name: 'Đội Cứu hộ Test 01',
      code: 'TEST_TEAM_01',
      type: 'TOW_TRUCK',
      zone: 'Quận 1',
      status: 'AVAILABLE',
      currentLocation: {
        type: 'Point',
        coordinates: [106.6948, 10.7769]
      }
    });
    console.log('Created Team');
  }

  // Create a Rescue User
  let user = await User.findOne({ email: 'rescue@test.vn' });
  if (!user) {
    user = await User.create({
      name: 'Rescue Staff',
      email: 'rescue@test.vn',
      phone: '0981234567',
      passwordHash: '123456',
      role: 'RESCUE',
      rescueTeam: team._id,
      isActive: true,
      availabilityStatus: 'ONLINE'
    });
    console.log('Created User');
  } else {
    user.rescueTeam = team._id;
    user.role = 'RESCUE';
    await user.save();
  }

  console.log('Seed done. Email: rescue@test.vn / Pass: 123456');
  process.exit(0);
}

seed();
