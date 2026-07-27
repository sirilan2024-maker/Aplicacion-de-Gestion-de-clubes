const http = require('http');

const payload = JSON.stringify({
  playerFirstName: 'Prueba',
  playerLastName: 'API',
  tutor1Email: 'pruebaapi2@mail.com',
  playerDni: '12345678B'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error(e));
req.write(payload);
req.end();
