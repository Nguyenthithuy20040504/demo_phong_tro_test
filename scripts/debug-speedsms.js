const axios = require('axios');
require('dotenv').config();

async function testSpeedSMS() {
  const accessToken = '3WRrs6hC743cr6kzNsPFJwnA0wlOvFKe'; // Token anh cung cấp
  const phone = '0987391910'; // Thay bằng một số điện thoại thật của anh để test
  const content = 'Test nhac no tu he thong Phong Tro';
  
  // Chuẩn hóa số
  let normalizedPhone = phone.replace(/[^0-9]/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '84' + normalizedPhone.substring(1);
  }

  console.log('--- Đang test SpeedSMS ---');
  console.log('Phone:', normalizedPhone);
  
  try {
    const response = await axios.post('https://api.speedsms.vn/index.php/sms/send', {
      to: [normalizedPhone],
      content: content,
      sms_type: 2,
      sender: '' // Để trống sender để dùng mặc định nếu chưa có Brandname
    }, {
      auth: {
        username: accessToken,
        password: ''
      }
    });

    console.log('KẾT QUẢ TỪ SPEEDSMS:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'success') {
      console.log('=> Gửi THÀNH CÔNG!');
    } else {
      console.log('=> Gửi THẤT BẠI. Mã lỗi:', response.data.code);
    }
  } catch (error) {
    console.error('LỖI KẾT NỐI:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testSpeedSMS();
