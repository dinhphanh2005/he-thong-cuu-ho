const { spawn } = require('child_process');
const numClients = 10;
for (let i = 0; i < numClients; i++) {
  spawn('node', ['test_tc12_ratelimit.js'], { stdio: 'inherit' });
}
