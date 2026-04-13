const { io } = require('socket.io-client');
const axios = require('axios');

const API_URL = 'http://localhost:5001';
const LOGIN_DATA = { loginId: 'rescue@test.vn', password: '123456' };

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, LOGIN_DATA);
    const { accessToken } = loginRes.data;
    console.log('Login successful');

    const socket = io(API_URL, {
      auth: { token: accessToken }
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      
      let lat = 10.7769;
      let lng = 106.6948;

      const interval = setInterval(() => {
        lat += 0.0001; // Simulation: moving North-East
        lng += 0.0001;
        
        console.log(`Updating location: [${lng.toFixed(6)}, ${lat.toFixed(6)}]`);
        socket.emit('rescue:updateLocation', { lat, lng });
      }, 2000);

      // Stop after 20 seconds
      setTimeout(() => {
        clearInterval(interval);
        console.log('Simulation finished');
        socket.disconnect();
        process.exit(0);
      }, 20000);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
