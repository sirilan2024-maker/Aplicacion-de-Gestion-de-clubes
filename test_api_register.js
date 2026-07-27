const fetch = require('node-fetch');

async function testRegistration() {
  const payload = {
    playerFirstName: 'Prueba',
    playerLastName: 'API',
    tutor1Email: 'pruebaapi@mail.com',
    playerDni: '12345678A'
  };

  try {
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (e) {
    console.error(e);
  }
}
testRegistration();
