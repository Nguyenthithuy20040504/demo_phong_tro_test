import axios from 'axios';

/**
 * Gửi tin nhắn SMS qua nhà cung cấp SpeedSMS
 * Tài liệu: https://speedsms.vn/api-quan-ly-tin-nhan/
 */
export async function sendSMS(phone: string, content: string) {
  const accessToken = process.env.SPEEDSMS_ACCESS_TOKEN;
  const sender = process.env.SPEEDSMS_SENDER;
  const smsType = process.env.SPEEDSMS_TYPE || '3';

  if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN_HERE') {
    console.warn('[SMS] Bỏ qua gửi SMS vì chưa cấu hình SPEEDSMS_ACCESS_TOKEN.');
    return { success: false, message: 'Chưa cấu hình API SpeedSMS' };
  }

  // Chuẩn hóa số điện thoại cho SpeedSMS (84...)
  let normalizedPhone = phone.replace(/[^0-9]/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '84' + normalizedPhone.substring(1);
  }

  try {
    console.log(`[SpeedSMS] Đang gửi tới ${normalizedPhone} (Type: ${smsType})...`);
    
    // Sử dụng Basic Auth: access_token là username, password để trống
    const postData: any = {
      to: [normalizedPhone],
      content: content,
      sms_type: parseInt(smsType)
    };
    
    // Chỉ thêm sender nếu có giá trị thực tế
    if (sender && sender.trim() !== '') {
      postData.sender = sender;
    }

    const response = await axios.post('https://api.speedsms.vn/index.php/sms/send', postData, {
      auth: {
        username: accessToken,
        password: ''
      }
    });

    // Kết quả trả về từ SpeedSMS
    // { "status": "success", "code": "00", "data": { "tranId": 123, "totalMoney": 500, ... } }
    if (response.data && response.data.status === 'success') {
      console.log(`[SMS Success] Đã gửi tới ${phone}. TranID: ${response.data.data?.tranId}`);
      return { success: true, data: response.data.data };
    } else {
      console.error(`[SMS Error] SpeedSMS trả về lỗi:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error: any) {
    console.error(`[SMS Crash] Lỗi khi gọi API SpeedSMS:`, error.response?.data || error.message);
    return { success: false, message: error.message };
  }
}
