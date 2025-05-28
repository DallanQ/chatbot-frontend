#!/usr/bin/env node

const { execSync } = require('node:child_process');
const os = require('node:os');
const net = require('node:net');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port, '::');
  });
}

async function killPort3000() {
  // First check if port 3000 is actually in use
  const portInUse = await isPortInUse(3000);

  if (!portInUse) {
    console.log('Port 3000 is free');
    return;
  }

  console.log('Port 3000 is in use, searching for processes...');

  try {
    if (os.platform() === 'win32') {
      // Windows: Kill any node process that might be using the port
      try {
        execSync('taskkill /F /IM node.exe', { stdio: 'pipe' });
        console.log('Killed node processes');
      } catch (e) {
        // Ignore errors
      }
    } else {
      // Unix/Linux/Mac: Try multiple approaches

      // 1. Try to find process by port using lsof
      try {
        const lsofResult = execSync('lsof -ti:3000', {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        const pids = lsofResult.trim().split('\n').filter(Boolean);

        if (pids.length > 0) {
          console.log(`Found PIDs on port 3000: ${pids.join(', ')}`);
          for (const pid of pids) {
            try {
              execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
              console.log(`Killed process ${pid}`);
            } catch (e) {
              // Process might have already exited
            }
          }
        }
      } catch (e) {
        // lsof might not be available or no processes found
      }

      // 2. Try to find next-server processes
      try {
        const psResult = execSync(
          'ps aux | grep -E "next-server|node.*next" | grep -v grep',
          { encoding: 'utf8', stdio: 'pipe' },
        );

        if (psResult.trim()) {
          console.log('Found Next.js processes, killing them...');

          // Kill next-server processes
          try {
            execSync('pkill -9 -f "next-server"', { stdio: 'pipe' });
          } catch (e) {
            // Ignore if no processes found
          }

          // Kill node processes running next
          try {
            execSync('pkill -9 -f "node.*next.*dev"', { stdio: 'pipe' });
          } catch (e) {
            // Ignore if no processes found
          }
        }
      } catch (e) {
        // No processes found
      }
    }

    // Wait for cleanup
    console.log('Waiting for port to be released...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if port is now free
    const stillInUse = await isPortInUse(3000);
    if (stillInUse) {
      console.log('Warning: Port 3000 might still be in use');
    } else {
      console.log('Port 3000 is now free');
    }
  } catch (e) {
    console.error('Error during cleanup:', e.message);
  }
}

killPort3000().catch(console.error);
