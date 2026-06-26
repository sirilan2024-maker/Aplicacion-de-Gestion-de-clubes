const http = require('http');

const data = JSON.stringify({ query: 'cuantas tarjetas amarillas lleva el infantil a y a que jugadores se las han sacado' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/asistente-ia',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('RESPONSE:', body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
