const http = require('http');

const HOST = '127.0.0.1';
const PORT = process.env.PORT || 5000;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: HOST,
      port: PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });

    req.on('error', e => reject(e));
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: HOST,
      port: PORT,
      path,
      method: 'GET',
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    };

    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });

    req.on('error', e => reject(e));
    req.end();
  });
}

(async () => {
  try {
    console.log('Checking /api/health...');
    const h = await get('/api/health');
    console.log('Health', h.status);

    console.log('Logging in as admin...');
    const login = await post('/api/auth/login', { email: 'admin@ironforge.com', password: 'password123' });
    console.log('Login', login.status);
    if (login.status !== 200) {
      console.error('Login failed:', login.body);
      process.exit(2);
    }

    const token = JSON.parse(login.body).token;

    console.log('Fetching admin dashboard...');
    const dash = await get('/api/dashboard/admin', token);
    console.log('Dashboard', dash.status, dash.body.substring(0, 200));

    if (dash.status !== 200) {
      console.error('Dashboard check failed');
      process.exit(3);
    }

    console.log('Smoke test passed');
    process.exit(0);
  } catch (e) {
    console.error('Smoke test error', e);
    process.exit(1);
  }
})();
