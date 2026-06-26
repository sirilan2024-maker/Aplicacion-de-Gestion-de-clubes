const fetch = require('node-fetch');

async function check() {
  try {
    const res = await fetch('http://localhost:3000/api/asistente-ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: "en que minuto le meten mas goles al cadete a" })
    });
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("RESPONSE:", text);
  } catch (e) {
    console.error(e);
  }
}

check();
