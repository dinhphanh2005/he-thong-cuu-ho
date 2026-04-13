// File: test_tc12_ratelimit.js
// Mục đích: Kiểm thử TC-12 Ngăn chặn tấn công Spam (Rate Limiting)
// HDSD: Chạy lệnh `node test_tc12_ratelimit.js` trong thư mục backend.

const http = require('http');

const PORT = process.env.PORT || 5001;
// Sử dụng một endpoint bất kỳ có đi qua rate limiter của Express
const TEST_URL = `http://localhost:${PORT}/api/v1/health`; 
const REQUESTS_TO_SEND = 100;

console.log(`=================================================`);
console.log(`🚨 BẮT ĐẦU KIỂM THỬ: TC-12 (Rate Limiting)`);
console.log(`Mục tiêu: Gửi ${REQUESTS_TO_SEND} HTTP requests tới ${TEST_URL}`);
console.log(`Mong đợi: Chặn từ request thứ 51 (Mã lỗi 429)`);
console.log(`=================================================\n`);

let successCount = 0;
let blockCount = 0;
let firstBlockAt = -1;
let completedRequests = 0;

function sendRequest(index) {
  return new Promise((resolve) => {
    http.get(TEST_URL, (res) => {
      // Bỏ qua lấy body, chỉ cần status code
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode === 429) {
          if (firstBlockAt === -1) firstBlockAt = index;
          blockCount++;
          console.log(`[Request ${index.toString().padStart(3, '0')}] 🛑 Bị chặn (HTTP 429)`);
        } else {
          successCount++;
          console.log(`[Request ${index.toString().padStart(3, '0')}] ✅ Thành công (HTTP ${res.statusCode})`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`[Request ${index.toString().padStart(3, '0')}] ❌ Lỗi kết nối: ${err.message}`);
      resolve();
    });
  });
}

async function runTests() {
  // Gửi requests tuần tự nhanh để dễ theo dõi log trên terminal
  for (let i = 1; i <= REQUESTS_TO_SEND; i++) {
    await sendRequest(i);
    // Có thể sleep nhẹ 10-20ms giữa cực requests nếu cần, 
    // nhưng rate limit theo IP sẽ chặn dù có gửi nạp dồn hay không.
    await new Promise(r => setTimeout(r, 10)); 
  }

  console.log(`\n=================================================`);
  console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ TC-12`);
  console.log(`=================================================`);
  console.log(`- Tổng số Request đã gửi: ${REQUESTS_TO_SEND}`);
  console.log(`- Request thành công (Pass): ${successCount}`);
  console.log(`- Request bị chặn (429):    ${blockCount}`);
  
  if (firstBlockAt > -1) {
    console.log(`- Hệ thống bắt đầu chặn Rate Limit từ request số: [ ${firstBlockAt} ]`);
    if (firstBlockAt === 51) {
      console.log(`\n🎉 KẾT QUẢ: ĐẠT YÊU CẦU (PASSED)`);
    } else {
      console.log(`\n⚠️ KẾT QUẢ: KHÔNG ĐÚNG MONG ĐỢI (FAILED - Đáng lẽ phải cấu hình MAX=50 thì chặn ở 51)`);
    }
  } else {
    console.log(`\n❌ KẾT QUẢ: KHÔNG BỊ CHẶN (FAILED - Hãy kiểm tra lại RateLimiter hoặc .env)`);
  }
}

runTests();
