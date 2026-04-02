const http = require('http');
const https = require('https');

// Nhận tham số từ terminal, mặc định là 5 phút
const intervalMinutes = process.argv[2] ? parseInt(process.argv[2], 10) : 5;
const pingUrl = process.argv[3] || 'http://localhost:3000/api/cron/hoa-don/nhac-no';

console.log(`[Auto-Notifier] Khởi động bộ quét Hóa Đơn Tự Động!`);
console.log(`[Auto-Notifier] Sẽ quét và gửi thông báo nhắc nợ mỗi: ${intervalMinutes} phút.`);
console.log(`[Auto-Notifier] API Mục tiêu: ${pingUrl}\n`);

const pingCron = () => {
  console.log(`[${new Date().toLocaleString('vi-VN')}] Đang chạy Auto-Cron...`);
  
  const client = pingUrl.startsWith('https') ? https : http;
  
  client.get(pingUrl, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`[Thành công] ${parsed.message || JSON.stringify(parsed)}`);
      } catch (e) {
        console.log(`[Response] ${data}`);
      }
    });
  }).on('error', (err) => {
    console.error(`[Lỗi] Server Next.js có thể chưa bật hoặc bị lỗi: ${err.message}`);
  });
};

// Chạy lần đầu tiên ngay lập tức
pingCron();

// Thiết lập vòng lặp theo phút
setInterval(pingCron, intervalMinutes * 60 * 1000);
