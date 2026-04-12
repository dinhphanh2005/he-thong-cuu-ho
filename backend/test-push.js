/**
 * Quick test: send a push notification to a specific Expo push token
 * Usage: node test-push.js ExponentPushToken[xxxxxxxx]
 */
const https = require('https');

const token = process.argv[2];

if (!token || !token.startsWith('ExponentPushToken')) {
  console.error('Usage: node test-push.js ExponentPushToken[your-token-here]');
  process.exit(1);
}

const message = {
  to: token,
  title: '🚨 Test Thông Báo',
  body: 'Hệ thống cứu hộ đang hoạt động tốt!',
  sound: 'default',
  data: { type: 'TEST' },
};

const body = JSON.stringify([message]);

const options = {
  hostname: 'exp.host',
  path: '/--/api/v2/push/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

console.log(`\nGửi thông báo đến: ${token}\n`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const result = JSON.parse(data);
    const item = result.data?.[0];
    if (item?.status === 'ok') {
      console.log('✅ Thành công! Kiểm tra điện thoại của bạn.');
    } else {
      console.log('❌ Thất bại:', item?.message || JSON.stringify(result));
    }
  });
});

req.on('error', (err) => console.error('Lỗi:', err.message));
req.write(body);
req.end();
