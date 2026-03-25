import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';
import SaasPayment from '@/models/SaaSPayment';
import HoaDon from '@/models/HoaDon';
import payOS from '@/lib/payos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Bước 1: Xác thực mã bí mật, chống giả mạo Call API
    let webhookData;
    try {
      webhookData = payOS.verifyPaymentWebhookData(body);
    } catch (e) {
      console.error('PayOS webhook chữ ký bảo mật sai!', e);
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 400 });
    }

    // Bước 2: Kiểm tra tiền đã về tài khoản ngân hàng chưa (code = 00)
    if (webhookData.code === '00') {
      const orderCode = webhookData.orderCode;
      
      await dbConnect();

      // Tìm kiếm hóa đơn khớp với OrderCode (có thể đang chờ duyệt hoặc đã thanh toán nhưng chưa gia hạn)
      const payment = await SaasPayment.findOne({ 
        maDonHang: Number(orderCode), 
        $or: [{ trangThai: 'choDuyet' }, { trangThai: 'daThanhToan', ngayHetHanMoi: null }] 
      });
      
      if (payment) {
        // Xử lý tự động gia hạn tương tự như kịch bản trước đây
        const plan = await GoiDichVu.findById(payment.goiDichVu);
        const user = await NguoiDung.findById(payment.chuNha);
        
        if (plan && user) {
          let userPlanRole: 'mienPhi' | 'coBan' | 'chuyenNghiep' = 'mienPhi';
          if (plan.ten.toLowerCase().includes('cơ bản') || plan.ten.toLowerCase().includes('basic')) {
             userPlanRole = 'coBan';
          }
          if (plan.ten.toLowerCase().includes('chuyên nghiệp') || plan.ten.toLowerCase().includes('professional')) {
             userPlanRole = 'chuyenNghiep';
          }

          const currentExpiry = user.ngayHetHan ? new Date(user.ngayHetHan) : new Date();
          const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
          
          const newExpiry = new Date(startDate);
          newExpiry.setMonth(startDate.getMonth() + plan.thoiGian);

          // Nâng cấp và cộng ngày cho Chủ Nhà
          user.goiDichVu = userPlanRole;
          user.ngayHetHan = newExpiry;
          await user.save();

          // Đồng bộ ngày hết hạn cho quân lính (Nhân viên)
          await NguoiDung.updateMany(
            { nguoiQuanLy: user._id, $or: [{ vaiTro: 'nhanVien' }, { role: 'nhanVien' }] },
            { $set: { ngayHetHan: newExpiry } }
          );

          // Chuyển Trạng thái hóa đơn thành Thành công
          payment.trangThai = 'daThanhToan';
          payment.ngayHetHanMoi = newExpiry;
          await payment.save();
          
          console.log(`[PAYOS AUTOMATION] Vừa tự động gia hạn ${plan.thoiGian} tháng cho Chủ Nhà ${user.email} qua Bank Transfer!`);
          return NextResponse.json({ success: true });
        }
      }

      // Nếu không phải gói SaaS, kiểm tra xem có phải hóa đơn tiền phòng (%)
      const hoaDon = await HoaDon.findOne({ paymentOrderId: String(orderCode), trangThai: { $ne: 'daThanhToan' } });
      if (hoaDon) {
        // Cập nhật hóa đơn tiền phòng
        hoaDon.daThanhToan = hoaDon.tongTien;
        hoaDon.conLai = 0;
        hoaDon.trangThai = 'daThanhToan';
        await hoaDon.save();
        
        console.log(`[PAYOS AUTOMATION] Vừa tự động cập nhật Thanh toán cho Hóa đơn ${hoaDon.maHoaDon} của Khách thuê!`);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ success: true, message: 'Đã xử lý hoặc không hợp lệ' });
    }

    // Trả về { success: true } theo chuẩn bắt buộc của PayOs Webhook
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook PayOS bị lỗi không mong muốn:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
