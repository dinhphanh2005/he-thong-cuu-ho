const { io } = require('socket.io-client');
const axios = require('axios');

const API_URL = 'http://localhost:5001';
const LOGIN_DATA = { loginId: 'admin@cuuho.vn', password: '123456' };

async function run() {
  try {
    console.log('Logging in as Admin...');
    const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, LOGIN_DATA);
    const { accessToken } = loginRes.data;
    console.log('Login successful');

    const socket = io(API_URL, {
      auth: { token: accessToken }
    });

    socket.on('connect', () => {
      console.log('Admin connected:', socket.id);
      console.log('Waiting for location updates...');
    });

    socket.on('rescue:location', (data) => {
      console.log('------------------------------------');
      console.log(`Team: ${data.teamName} (${data.teamId})`);
      console.log(`New Location: [${data.coordinates[0]}, ${data.coordinates[1]}]`);
      console.log(`Updated at: ${data.updatedAt}`);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Stay connected for 25 seconds
    setTimeout(() => {
      console.log('Receiver test finished');
      socket.disconnect();
      process.exit(0);
    }, 25000);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
