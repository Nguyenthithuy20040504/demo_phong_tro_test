import { IHoaDon } from '../models/HoaDon';
import { IKhachThue } from '../models/KhachThue';
import { IPhong } from '../models/Phong';

// Utility format tiền tệ
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export function generateZaloDeepLink(hoaDon: any) {
  const khach = hoaDon.khachThue;
  const phong = hoaDon.phong;

  if (!khach || !phong) {
    return '';
  }

  // Khẩu trang số điện thoại (vd: 0912345678 -> 84912345678)
  let phone = khach.soDienThoai || khach.phone || '';
  if (!phone) {
    return '';
  }
  
  if (phone.startsWith('0')) {
    phone = `84${phone.slice(1)}`;
  }

  const dueDate = new Date(hoaDon.hanThanhToan).toLocaleDateString('vi-VN');

  // Xây dựng nội dung tin nhắn chi tiết
  // Lưu ý sử dụng \n để xuống dòng, Zalo parse url-encoded rất tốt.
  let message = `Xin chào ${khach.hoTen},\n\n`;
  message += `Đây là thông báo hóa đơn Tiền phòng và Dịch vụ Tháng ${hoaDon.thang}/${hoaDon.nam} của Phòng ${phong.maPhong}.\n`;
  message += `------------------------------\n`;
  message += `▪ Tiền phòng: ${formatCurrency(hoaDon.tienPhong)}\n`;
  
  if (hoaDon.tienDien > 0) {
    message += `▪ Điện (${hoaDon.soDien} ký): ${formatCurrency(hoaDon.tienDien)}\n`;
  }
  
  if (hoaDon.tienNuoc > 0) {
    message += `▪ Nước (${hoaDon.soNuoc} khối): ${formatCurrency(hoaDon.tienNuoc)}\n`;
  }

  if (hoaDon.phiDichVu && hoaDon.phiDichVu.length > 0) {
    hoaDon.phiDichVu.forEach((dv: any) => {
       message += `▪ ${dv.ten}: ${formatCurrency(dv.gia)}\n`;
    });
  }
  
  message += `------------------------------\n`;
  message += `👉 Tổng cộng (Hóa đơn): ${formatCurrency(hoaDon.tongTien)}\n`;
  if (hoaDon.daThanhToan > 0) {
    message += `👉 Đã thanh toán trước: ${formatCurrency(hoaDon.daThanhToan)}\n`;
  }
  message += `🚨 Số tiền cần đóng: ${formatCurrency(hoaDon.conLai)}\n\n`;
  message += `Hạn thanh toán là ngày ${dueDate}. Bạn vui lòng sắp xếp thanh toán đúng hạn giúp mình nhé!\n\nCảm ơn bạn!`;

  const encodedMessage = encodeURIComponent(message);
  
  // Trả về Deep Link Zalo mở trình duyệt hoặc ứng dụng.
  return `https://zalo.me/${phone}?text=${encodedMessage}`;
}
