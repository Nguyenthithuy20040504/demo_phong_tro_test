const fetch = require('node-fetch');

async function check() {
  const res = await fetch('http://localhost:3000/api/hoa-don', {
    headers: {
      cookie: 'next-auth.session-token=your-token-if-needed' // Wait, I might need to simulate session or query DB directly to see if mongoose hook changes it
    }
  });
}
