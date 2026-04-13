require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Đã kết nối DB');

    const adminEmail = 'admin@cuuho.vn';
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.log(`Không tìm thấy user với email: ${adminEmail}. Bạn có thể chạy seed_test_data.js trước.`);
      process.exit(1);
    }

    // Đặt lại mật khẩu (passwordHash sẽ được hash lại trong pre('save') của model User)
    user.passwordHash = '123456';
    await user.save();

    console.log(`✅ Đã reset mật khẩu cho ${adminEmail} thành: 123456`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi:', err.message);
    process.exit(1);
  }
}

resetAdmin();
