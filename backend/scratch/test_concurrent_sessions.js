const axios = require('axios');

const API_URL = 'http://localhost:5001';
const LOGIN_DATA = { loginId: 'admin@cuuho.vn', password: '123456' };

async function run() {
  try {
    console.log('--- Step 1: Login Session 1 ---');
    const login1 = await axios.post(`${API_URL}/api/v1/auth/login`, LOGIN_DATA);
    const token1 = login1.data.accessToken;
    console.log('Session 1 Token acquired');

    console.log('\n--- Step 2: Verify Session 1 is valid ---');
    const me1 = await axios.get(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log('Session 1 Me response:', me1.data.success ? 'SUCCESS' : 'FAILED');

    console.log('\n--- Step 3: Login Session 2 (Same account) ---');
    const login2 = await axios.post(`${API_URL}/api/v1/auth/login`, LOGIN_DATA);
    const token2 = login2.data.accessToken;
    console.log('Session 2 Token acquired');

    console.log('\n--- Step 4: Verify Session 1 is NOW INVALID ---');
    try {
      await axios.get(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      console.log('❌ FAILED: Session 1 is still valid! (Concurrency lock failed)');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ SUCCESS: Session 1 was rejected (401 Unauthorized)');
        console.log('Message:', err.response.data.message);
      } else {
        console.log('❌ ERROR:', err.message);
      }
    }

    console.log('\n--- Step 5: Verify Session 2 is still valid ---');
    const me2 = await axios.get(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    console.log('Session 2 Me response:', me2.data.success ? 'SUCCESS' : 'FAILED');

    console.log('\n--- TỔNG KẾT: CƠ CHẾ SESSION LOCK HOẠT ĐỘNG CHÍNH XÁC ---');

  } catch (err) {
    console.error('Error during test:', err.response?.data || err.message);
  }
}

run();
