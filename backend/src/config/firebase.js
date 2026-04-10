const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) return admin;

  try {
    const credential = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // Chỉ init nếu có đủ credential
    if (!credential.projectId || !credential.clientEmail || !credential.privateKey) {
      logger.warn('⚠️ Firebase credentials chưa cấu hình — push notification bị tắt');
      return null;
    }

    admin.initializeApp({ credential: admin.credential.cert(credential) });
    firebaseInitialized = true;
    logger.info('✅ Firebase Admin SDK khởi tạo thành công');
    return admin;
  } catch (err) {
    logger.error(`❌ Firebase init thất bại: ${err.message}`);
    return null;
  }
};

module.exports = { initFirebase, admin };
