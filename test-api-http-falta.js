const http = require('http');

const data = JSON.stringify({ query: 'cuantos goles de falta nos han metido esta temporada y en que partidos?' });

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
