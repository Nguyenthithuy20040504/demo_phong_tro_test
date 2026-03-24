const https = require('https');

const options = {
  hostname: 'api.httzip.com',
  port: 443,
  path: '/api/bank/id-lookup-prod?bank=970422&account=0359569239',
  method: 'POST',
};

const req = https.request(options, (res) => {
  let chunks = '';
  res.on('data', (d) => {
    chunks += d;
  });
  res.on('end', () => {
    console.log("httzip", chunks);
  });
});

req.end();

const options2 = {
  hostname: 'api.vietqr.io',
  port: 443,
  path: '/v2/lookup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-id': 'b1c7dc4a-38bb-4b7b-8b5e-99f6b4d3f56e',
    'x-api-key': '059f1c79-cacc-4876-badd-bb389a69123b' // some random test keys from online documentation
  }
};
const data2 = JSON.stringify({bin: '970422', accountNumber: '0359569239'});
const req2 = https.request(options2, (res) => {
  let chunks = '';
  res.on('data', (d) => { chunks += d; });
  res.on('end', () => console.log('vietqr test keys', chunks));
});
req2.write(data2);
req2.end();

const options3 = {
  hostname: 'api.vietqr.io',
  port: 443,
  path: '/v2/lookup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-id': 'f7f6f59d-d6c5-4428-9f37-124b89dc1d5d', // from another public repo
    'x-api-key': 'ed80f4f7-e7f0-4d43-9878-a892b19280df'
  }
};
const data3 = JSON.stringify({bin: '970422', accountNumber: '0359569239'});
const req3 = https.request(options3, (res) => {
  let chunks = '';
  res.on('data', (d) => { chunks += d; });
  res.on('end', () => console.log('vietqr test keys 2', chunks));
});
req3.write(data3);
req3.end();
