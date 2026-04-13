require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

// Reset mật khẩu cho tất cả ADMIN thành 123456
async function resetAllAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Đã kết nối DB:', process.env.MONGO_URI.split('@')[1]);

    const admins = await User.find({ role: 'ADMIN' });
    console.log(`Tìm thấy ${admins.length} tài khoản ADMIN:`);

    for (const admin of admins) {
      admin.passwordHash = '123456';
      await admin.save(); // pre('save') sẽ tự hash lại
      console.log(`✅ Reset xong: ${admin.email}`);
    }

    console.log('\n📋 Tất cả tài khoản ADMIN đã được đặt lại mật khẩu thành: 123456');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi:', err.message);
    process.exit(1);
  }
}

resetAllAdmins();
