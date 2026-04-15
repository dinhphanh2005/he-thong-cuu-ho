const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/v1';

async function testNoSqlInjection() {
  console.log('--- BĂT ĐẦU TEST BẢO MẬT (NoSQL Injection) ---');

  // Test 1: Đăng nhập bypass bằng $gt (greater than)
  console.log('\\n[TEST 1] Đăng nhập bypass (Toán tử $gt)');
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      loginId: { $gt: "" }, 
      password: { $gt: "" }
    });
    console.error('❌ LỖI BẢO MẬT: Đăng nhập thành công với payload NoSQL Injection!', res.data);
  } catch (error) {
    if (error.response?.status === 422 || error.response?.status === 401) {
      console.log(`✅ AN TOÀN: Hệ thống chặn NoSQL Payload với status ${error.response.status}`);
    } else {
      console.log(`ℹ️ KẾT QUẢ KHÁC: HTTP ${error.response ? error.response.status : error.message}`);
    }
  }

  // Test 2: Thử lấy danh sách tracking với object lạ
  console.log('\\n[TEST 2] Tracking bằng Payload $regex');
  try {
    const trackingPayload = "%7B%24regex%3A%22.%2A%22%7D"; // {$regex:".*"} URL encoded
    const res = await axios.get(`${BASE_URL}/incidents/track/${trackingPayload}`);
    console.error('❌ LỖI BẢO MẬT: API trả về dữ liệu cho payload regex!', res.data);
  } catch (error) {
    // 404 là đúng vì mã code '{$regex:".*"}' đã bị sanitize thành chữ thường hoặc ko khớp
    // hoặc express-mongo-sanitize sẽ xóa nó khỏi req.params
    console.log(`✅ AN TOÀN: Request bị từ chối / Không tìm thấy, status = ${error.response ? error.response.status : 'Unknown'}`);
  }

  console.log('\\n--- KẾT THÚC TEST BẢO MẬT ---');
}

testNoSqlInjection();
