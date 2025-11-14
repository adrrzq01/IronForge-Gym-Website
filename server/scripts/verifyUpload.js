const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Quick smoke test to create a member and upload a tiny jpeg (embedded base64)
(async () => {
  try {
    const API = process.env.API_URL || 'http://localhost:5000/api';
    console.log('Using API:', API);

    // Admin credentials used by previous flows
    const admin = { email: process.env.SMOKE_ADMIN_EMAIL || 'admin@ironforge.test', password: process.env.SMOKE_ADMIN_PASSWORD || 'password123' };

    // Login
    console.log('Logging in as admin...');
    const loginRes = await axios.post(API + '/auth/login', admin);
    const token = loginRes.data.token;
    if (!token) throw new Error('No token returned from login');
    console.log('Got token');

    const headers = { Authorization: `Bearer ${token}` };

    // Create member
    console.log('Creating test member...');
    const memberPayload = { name: 'Smoke Test Member', age: 30, gender: 'male', email: `smoke-${Date.now()}@test.local`, phone: '9999999999', address: 'Test', plan_id: null };
    const createRes = await axios.post(API + '/members', memberPayload, { headers });
    const memberId = createRes.data.memberId;
    console.log('Created member', memberId);

    // Tiny 1x1 white jpeg base64
    const jpegBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAUGB//EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAf8A/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwD/xAAVEQEBAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=';
    const buffer = Buffer.from(jpegBase64, 'base64');

    const FormData = require('form-data');
    const form = new FormData();
    form.append('photo', buffer, { filename: 'smoke.jpg', contentType: 'image/jpeg' });

    console.log('Uploading photo...');
    const uploadRes = await axios.post(API + `/members/${memberId}/photo`, form, { headers: { ...headers, ...form.getHeaders() } });
    console.log('Upload response:', uploadRes.data);

    console.log('Verify path accessible...');
    const photoPath = uploadRes.data.photoPath;
    const url = API.replace('/api', '') + photoPath; // convert to full url
    const fetchPhoto = await axios.get(url, { responseType: 'arraybuffer' });
    if (fetchPhoto.status === 200) {
      console.log('Photo served successfully:', url);
      process.exit(0);
    } else {
      console.error('Photo fetch status:', fetchPhoto.status);
      process.exit(2);
    }
  } catch (err) {
    console.error('Smoke verify failed:', err.message || err);
    if (err.response) console.error('Response body:', err.response.data);
    process.exit(3);
  }
})();
