const axios = require('axios');
require('dotenv').config();
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5001';
const LOGIN_ID = 'admin@cuuho.vn';

async function run() {
  try {
    console.log('--- Step 1: Requesting OTP ---');
    await axios.post(`${API_URL}/api/v1/auth/send-otp`, { loginId: LOGIN_ID, type: 'email' });
    console.log('OTP request sent. Check backend logs for [MOCK EMAIL].');

    console.log('\n--- Step 2: Fetching OTP from DB (Simulation) ---');
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('../src/models/User');
    const user = await User.findOne({ email: LOGIN_ID });
    const otp = user.otpCode;
    console.log('Retrieved OTP from DB:', otp);

    console.log('\n--- Step 3: Verifying OTP ---');
    const verifyRes = await axios.post(`${API_URL}/api/v1/auth/verify-otp`, { 
      loginId: LOGIN_ID, 
      otp 
    });
    console.log('Verification result:', verifyRes.data.message);

    if (verifyRes.data.success) {
      console.log('\n✅ TỔNG KẾT: LUỒNG OTP HOẠT ĐỘNG CHÍNH XÁC');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();
