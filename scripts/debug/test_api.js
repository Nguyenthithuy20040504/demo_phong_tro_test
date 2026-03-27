const http = require('http');

async function run() {
  const req = http.request(
    'http://localhost:3000/api/admin/users',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    (res) => {
      let data = '';
      res.on('data', c => data+=c);
      res.on('end', () => console.log(res.statusCode, data));
    }
  );
  req.write(JSON.stringify({
    name: "Test",
    email: "test@example.com",
    password: "password123",
    role: "nhanVien",
    phone: ""
  }));
  req.end();
}
run();
