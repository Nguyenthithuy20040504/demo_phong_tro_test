import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';
import SaasPayment from '@/models/SaaSPayment';
import payOS from '@/lib/payos';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orderCodeStr = searchParams.get('orderCode');
    
    if (!orderCodeStr) {
       return NextResponse.json({ message: 'Missing orderCode' }, { status: 400 });
    }

    const orderCode = Number(orderCodeStr);

    await dbConnect();
    const mongoose = require('mongoose');
    const payment = await SaasPayment.findOne({ 
      maDonHang: orderCode, 
      chuNha: new mongoose.Types.ObjectId(session.user.id) 
    });
    
    if (!payment) {
      console.log(`Verify API: Payment NOT FOUND for orderCode=${orderCode}, session=${session.user.id}`);
      return NextResponse.json({ message: 'Hóa đơn không tồn tại hoặc không phải của bạn' }, { status: 404 });
    }

    // Nếu đã thanh toán và ĐÃ GIA HẠN rồi (bởi Webhook), bỏ qua
    if (payment.trangThai === 'daThanhToan' && payment.ngayHetHanMoi !== null) {
       return NextResponse.json({ status: 'PAID' });
    }

    // Nếu vẫn đang chờ duyệt, dùng API PayOS tra cứu trực tiếp tình trạng (dành cho Localhost ko có Webhook)
    const paymentInfo = await payOS.getPaymentLinkInformation(orderCode);

    if (paymentInfo.status === 'PAID') {
      const plan = await GoiDichVu.findById(payment.goiDichVu);
      const user = await NguoiDung.findById(payment.chuNha);
      
      if (plan && user) {
        let userPlanRole: 'mienPhi' | 'coBan' | 'chuyenNghiep' = 'mienPhi';
        if (plan.ten.toLowerCase().includes('cơ bản') || plan.ten.toLowerCase().includes('basic')) userPlanRole = 'coBan';
        if (plan.ten.toLowerCase().includes('chuyên nghiệp') || plan.ten.toLowerCase().includes('professional')) userPlanRole = 'chuyenNghiep';

        const currentExpiry = user.ngayHetHan ? new Date(user.ngayHetHan) : new Date();
        const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
        
        const newExpiry = new Date(startDate);
        newExpiry.setMonth(startDate.getMonth() + plan.thoiGian);

        user.goiDichVu = userPlanRole;
        user.ngayHetHan = newExpiry;
        await user.save();

        await NguoiDung.updateMany(
          { nguoiQuanLy: user._id, $or: [{ vaiTro: 'nhanVien' }, { role: 'nhanVien' }] },
          { $set: { ngayHetHan: newExpiry } }
        );

        payment.trangThai = 'daThanhToan';
        payment.ngayHetHanMoi = newExpiry;
        await payment.save();
        
        console.log(`[PAYOS API POLLING] Vừa tự động gia hạn an toàn do gọi bù cho Webhook ở Local!`);
      }
      return NextResponse.json({ status: 'PAID' });
    }

    return NextResponse.json({ status: paymentInfo.status });
  } catch (error) {
    console.error('Error verifying PayOS payment:', error);
    return NextResponse.json({ message: 'Lỗi tra cứu giao dịch bên PayOS' }, { status: 500 });
  }
}
