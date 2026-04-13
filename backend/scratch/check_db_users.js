require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB:', process.env.MONGO_URI.split('@')[1]); // Don't show password
    const count = await User.countDocuments();
    console.log('Total Users:', count);
    const users = await User.find({}, 'email phone role').limit(5);
    console.log('First 5 Users:', JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUsers();
