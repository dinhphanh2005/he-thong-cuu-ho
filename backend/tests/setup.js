const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Tắt log winston trong test
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = 'test-secret-key-123456';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = ''; // Tắt Redis trong test
process.env.FIREBASE_CREDENTIALS = ''; // Tắt Firebase trong test

// Config MongoMemoryServer — dùng version stable với ARM support
const MONGO_VERSION = process.env.MONGOMS_VERSION || '7.0.14';

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    binary: {
      version: MONGO_VERSION,
    },
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 120000); // Timeout dài hơn vì download binary lần đầu

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});
