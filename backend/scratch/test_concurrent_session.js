/**
 * Test: Concurrent Session Enforcement
 * Kịch bản: 2 lần login cùng 1 tài khoản → token cũ phải bị 401
 */
const axios = require('axios');

const API = 'http://localhost:5001/api/v1';
const CREDS = { loginId: 'dispatcher@cuuho.vn', password: '123456' };

async function run() {
  console.log('=== TEST: Concurrent Session Enforcement ===\n');

  // ── Bước 1: Login lần đầu (Thiết bị 1)
  console.log('[1] Login lần 1 (Thiết bị 1)...');
  const res1 = await axios.post(`${API}/auth/login`, CREDS);
  const token1 = res1.data.accessToken;
  console.log(`    ✅ Token 1 lấy được. sessionId trong JWT sẽ lưu vào DB.\n`);

  // ── Bước 2: Dùng token1 — phải hoạt động OK
  console.log('[2] Dùng token 1 gọi GET /auth/me (phải OK)...');
  const me1 = await axios.get(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`    ✅ OK: userId=${me1.data.data._id}\n`);

  // ── Bước 3: Login lần 2 từ "Thiết bị 2" (cùng tài khoản)
  console.log('[3] Login lần 2 (Thiết bị 2 — cùng tài khoản)...');
  const res2 = await axios.post(`${API}/auth/login`, CREDS);
  const token2 = res2.data.accessToken;
  console.log(`    ✅ Token 2 lấy được. DB đã cập nhật currentSessionId mới.\n`);

  // ── Bước 4: Dùng token1 lại — phải bị 401 (session cũ)
  console.log('[4] Dùng token 1 gọi GET /auth/me (phải 401)...');
  try {
    await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    console.log('    ❌ THẤT BẠI: Token cũ vẫn còn hoạt động! Lỗi bảo mật!');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log(`    ✅ CHÍNH XÁC: Token 1 bị từ chối (401 — Session mismatch)`);
      console.log(`    Message: ${err.response.data.message}`);
    } else {
      console.log(`    ⚠️  Lỗi khác: ${err.response?.status} — ${err.message}`);
    }
  }

  // ── Bước 5: Dùng token2 — vẫn phải OK
  console.log('\n[5] Dùng token 2 gọi GET /auth/me (phải vẫn OK)...');
  try {
    const me2 = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    console.log(`    ✅ OK: Token 2 hoạt động bình thường. userId=${me2.data.data._id}`);
  } catch (err) {
    console.log(`    ❌ THẤT BẠI: Token 2 bị từ chối — ${err.response?.data?.message}`);
  }

  console.log('\n=== KẾT THÚC TEST ===');
}

run().catch((err) => {
  console.error('Script error:', err.response?.data || err.message);
  process.exit(1);
});
