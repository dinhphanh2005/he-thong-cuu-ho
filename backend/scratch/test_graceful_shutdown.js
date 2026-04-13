const { spawn } = require('child_process');
const path = require('path');

console.log('Starting server for shutdown test...');
const serverPath = path.join(__dirname, '../src/server.js');

// Add /opt/homebrew/bin to PATH for the child process
const env = { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin` };

const server = spawn('node', [serverPath], { env });

let output = '';

server.stdout.on('data', (data) => {
  const msg = data.toString();
  output += msg;
  process.stdout.write(msg);

  if (msg.includes('🚀 Server đang chạy')) {
    console.log('\n--- Server ready. Sending SIGTERM... ---');
    server.kill('SIGTERM');
  }
});

server.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

server.on('exit', (code, signal) => {
  console.log(`\nServer exited with code ${code} and signal ${signal}`);
  
  if (output.includes('SIGTERM nhận được') && 
      output.includes('HTTP server đã đóng') && 
      output.includes('MongoDB đã đóng kết nối')) {
    console.log('\n✅ GRACEFUL SHUTDOWN SUCCESSFUL');
    process.exit(0);
  } else {
    console.log('\n❌ GRACEFUL SHUTDOWN FAILED - Missing closure logs');
    process.exit(1);
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n--- Test timeout ---');
  server.kill('SIGKILL');
  process.exit(1);
}, 30000);
