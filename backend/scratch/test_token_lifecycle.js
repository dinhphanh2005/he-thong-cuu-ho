const axios = require('axios');

const API_URL = 'http://localhost:5001';
const LOGIN_DATA = { loginId: 'admin@cuuho.vn', password: '123456' };

async function run() {
  try {
    console.log('--- Step 1: Login to get initial tokens ---');
    const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, LOGIN_DATA);
    let { accessToken, refreshToken } = loginRes.data;
    console.log('Initial tokens acquired.');
    console.log('Access Token acquired. (Expires in 30s)');

    console.log('\n--- Step 2: Waiting 35 seconds for Access Token to expire... ---');
    await new Promise(r => setTimeout(r, 35000));

    console.log('\n--- Step 3: Verifying Access Token is expired ---');
    try {
      await axios.get(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('❌ FAILED: Access Token should have expired!');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ SUCCESS: Access Token expired (401 Unauthorized)');
      } else {
        console.log('❌ ERROR:', err.message);
      }
    }

    console.log('\n--- Step 4: Refreshing Token ---');
    const refreshRes = await axios.post(`${API_URL}/api/v1/auth/refresh-token`, { refreshToken });
    accessToken = refreshRes.data.accessToken;
    console.log('New Access Token acquired via Refresh Token.');

    console.log('\n--- Step 5: Verifying New Access Token works ---');
    const meRes = await axios.get(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Me response with new token:', meRes.data.success ? 'SUCCESS' : 'FAILED');

    if (meRes.data.success) {
      console.log('\n✅ TỔNG KẾT: LUỒNG TOKEN LIFECYCLE HOẠT ĐỘNG CHÍNH XÁC');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();
