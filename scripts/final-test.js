const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001'; // Thay đổi port nếu cần

async function runFinalTest() {
  console.log('--- BẮT ĐẦU KIỂM TRA HỆ THỐNG MỚI ---');

  try {
    // 1. Test Cron Email
    console.log('\n[1/3] Đang test Cron EMAIL tự động...');
    const emailRes = await axios.get(`${BASE_URL}/api/cron/hoa-don/nhac-no/email`);
    console.log('=> Kết quả:', emailRes.data.message);

    // 2. Test Cron SMS
    console.log('\n[2/3] Đang test Cron SMS tự động...');
    const smsRes = await axios.get(`${BASE_URL}/api/cron/hoa-don/nhac-no/sms`);
    console.log('=> Kết quả:', smsRes.data.message);

    // 3. Test Manual SMS (Gửi tay qua API mới)
    // Giả sử có một hóa đơn ID mẫu
    console.log('\n[3/3] Đang test API Gửi SMS thủ công (Manual)...');
    // Bước này cần session auth để test thực tế từ trình duyệt, 
    // nên em sẽ chỉ in ra URL để anh bấm nút trên giao diện thử.
    console.log('=> Anh hãy vào giao diện, chọn hóa đơn và nhấn nút "Gửi SMS Nhắc Nợ" mới nhé!');

    console.log('\n--- HOÀN TẤT KIỂM TRA ---');
  } catch (error) {
    console.error('LỖI KHI TEST:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('=> LƯU Ý: Anh cần đảm bảo server (npm run dev) đang chạy trên port 3001.');
    }
  }
}

runFinalTest();
