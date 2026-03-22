import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import GoiDichVu from '@/models/GoiDichVu';
import SaasPayment from '@/models/SaaSPayment';
import payOS from '@/lib/payos';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'chuNha') {
      return NextResponse.json({ message: 'Tính năng này chỉ dành cho chủ nhà' }, { status: 401 });
    }

    const { planId } = await request.json();
    if (!planId) return NextResponse.json({ message: 'Vui lòng chọn gói dịch vụ' }, { status: 400 });

    await dbConnect();

    const plan = await GoiDichVu.findById(planId);
    if (!plan || !plan.isActive) {
      return NextResponse.json({ message: 'Gói dịch vụ không khả dụng' }, { status: 404 });
    }

    if (plan.ten.toLowerCase().includes('miễn phí') || plan.ten.toLowerCase().includes('free')) {
      return NextResponse.json({ message: 'Đã hết quyền dùng thử. Gói Miễn phí chỉ được áp dụng 1 lần duy nhất khi tạo tài khoản.' }, { status: 403 });
    }

    // Origin for returning dynamically
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Tạo mã đơn hàng độc nhất dạng SỐ nguyên
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
    
    // Lưu tạm hóa đơn trạng thái choDuyet
    const payment = new SaasPayment({
      chuNha: session.user.id,
      goiDichVu: planId,
      maDonHang: orderCode,
      soTien: plan.gia,
      trangThai: 'choDuyet',
      phuongThuc: 'chuyenKhoan',
      ngayThanhToan: new Date(),
      ngayHetHanMoi: new Date() // Tạm thời cung cấp giá trị rỗng để bypass check của Mongoose Model
    });
    
    await payment.save();

    // Tạo link thanh toán VietQR thông qua PayOS
    const body = {
      orderCode: orderCode,
      amount: 2000, // Đã fix cứng 2000 VNĐ để test thực tế (Mức tối thiểu của hầu hết Bank)
      description: `Gia han QLNT ${session.user.id.slice(0, 4)}`, // Tối đa 25 ký tự
      returnUrl: `${origin}/dashboard/gia-han-goi?success=true&orderCode=${orderCode}`,
      cancelUrl: `${origin}/dashboard/gia-han-goi?success=false&orderCode=${orderCode}`,
    };

    const paymentLinkRes = await payOS.createPaymentLink(body);

    return NextResponse.json({
      checkoutUrl: paymentLinkRes.checkoutUrl,
      paymentLinkId: paymentLinkRes.paymentLinkId,
      orderCode: orderCode
    });
  } catch (error) {
    console.error('Error creating PayOS payment link:', error);
    return NextResponse.json({ message: 'Lỗi khởi tạo cổng thanh toán' }, { status: 500 });
  }
}
