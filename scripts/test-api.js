/**
 * API Test Template - Kịch bản test API cơ bản cho dự án
 * 
 * Hướng dẫn sử dụng:
 * 1. Đảm bảo server đang chạy ở http://localhost:3001 (hoặc 3000)
 * 2. Cài đặt các biến cần thiết (ví dụ: email/password đăng nhập hoặc token)
 * 3. Chạy file này bằng lệnh: node scripts/test-api.js
 */

const BASE_URL = 'http://localhost:3001/api';

// Biến lưu cookie session (cần thiết khi gọi các API yêu cầu đăng nhập)
let sessionCookie = '';

/**
 * Hàm helper để gọi API với tuỳ chọn log kết quả
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    // Thu thập Set-Cookie từ header phản hồi nếu có
    const newCookies = response.headers.get('set-cookie');
    if (newCookies) {
      sessionCookie = newCookies;
    }

    const data = await response.json().catch(() => null);
    
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    console.error(`[Error] Khổng thể kết nối tới ${url}:`, error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * --- CÁC KỊCH BẢN TEST CỤ THỂ ---
 */

async function testAuthLogin() {
  console.log('\n--- BẮT ĐẦU TEST: ĐĂNG NHẬP API ---');
  
  // Thay đổi thông tin tài khoản admin hoặc tài khoản thật của bạn để test
  const payload = {
    email: 'admin@example.com',
    matKhau: '123456'
  };
  
  // NextAuth sử dụng endpoint /auth/callback/credentials cho credential login
  // Bạn có thể test endpoint custom nếu có
  const res = await fetchApi('/auth/callback/credentials', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  if (res.ok) {
    console.log('✅ Đăng nhập thành công! Cookie đã được lưu.');
  } else {
    console.log('❌ Đăng nhập thất bại:', res.status, res.data);
  }
}

async function testFetchHoso() {
  console.log('\n--- BẮT ĐẦU TEST: FETCH HỒ SƠ CÁ NHÂN ---');
  
  const res = await fetchApi('/user/profile');
  
  if (res.ok) {
    console.log('✅ Lấy hồ sơ thành công:', res.data.name, '-', res.data.email);
  } else {
    console.log('❌ Lấy hồ sơ thất bại:', res.status, res.data || '(Lỗi Unauthorized / cần đăng nhập)');
  }
}

async function testFetchDanhSachPhong() {
  console.log('\n--- BẮT ĐẦU TEST: FETCH DANH SÁCH PHÒNG ---');
  
  const res = await fetchApi('/phong?limit=5');
  
  if (res.ok) {
    console.log(`✅ Lấy danh sách thành công! Tìm thấy ${res.data.data?.length} phòng.`);
    if (res.data.data?.length > 0) {
      console.log('Mã phòng đầu tiên:', res.data.data[0].maPhong);
    }
  } else {
    console.log('❌ Lấy danh sách thất bại:', res.status, res.data);
  }
}

/**
 * --- CHẠY TẤT CẢ CÁC TEST ---
 */
async function runAllTests() {
  console.log('Chuẩn bị chạy các test script với base URL:', BASE_URL);
  console.log('--------------------------------------------------');

  // Chạy lần lượt các bước test
  
  // Bước 1: Log in
  // await testAuthLogin(); 

  // Bước 2: Test API yêu cầu xác thực
  // await testFetchHoso();
  
  // Bước 3: Test API tính năng chính
  await testFetchDanhSachPhong();
  
  console.log('\n--------------------------------------------------');
  console.log('HOÀN THÀNH TEST!');
}

runAllTests();
