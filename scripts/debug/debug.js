const http = require('http');

http.get('http://localhost:3000/api/su-co', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed.data[0], null, 2));
    } catch(e) {
      console.log(data.substring(0, 500));
    }
  });
}).on('error', err => console.log('Error:', err.message));
