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
    'x-client-id': 'f7f6f59d-d6c5-4428-9f37-124b89dc1d5d',
    'x-api-key': 'ed80f4f7-e7f0-4d43-9878-a892b19280df'
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
