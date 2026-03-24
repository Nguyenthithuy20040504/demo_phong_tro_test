const https = require('https');

const data = JSON.stringify({
  bin: '970422', // MB Bank
  accountNumber: '0359569239'
});

const options = {
  hostname: 'api.vietqr.io',
  port: 443,
  path: '/v2/lookup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-id': '2b500bc7-ec20-44c1-807e-6f2a6213d9c4',
    'x-api-key': '04a0e117-c330-4baa-8814-639e49689b98'
  }
};

const req = https.request(options, (res) => {
  let chunks = '';
  res.on('data', (d) => {
    chunks += d;
  });
  res.on('end', () => {
    console.log(chunks);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
