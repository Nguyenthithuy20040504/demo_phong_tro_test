import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import payOS from '@/lib/payos';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập để thực hiện thao tác này' }, { status: 401 });
    }

    const { hoaDonId } = await request.json();
    if (!hoaDonId) {
      return NextResponse.json({ message: 'Thiếu ID hóa đơn' }, { status: 400 });
    }

    await connectToDatabase();

    // Tìm hóa đơn và kiểm tra quyền (tạm thời cho phép cả chủ nhà và khách thuê của hóa đơn đó)
    const hoaDon = await HoaDon.findById(hoaDonId);
    if (!hoaDon) {
      return NextResponse.json({ message: 'Hóa đơn không tồn tại' }, { status: 404 });
    }

    if (hoaDon.trangThai === 'daThanhToan') {
      return NextResponse.json({ message: 'Hóa đơn này đã được thanh toán xong rồi nhé!' }, { status: 400 });
    }

    // Origin for returning dynamically
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Nếu đã có link và chưa hết hạn (PayOS link mặc định lâu), có thể trả về luôn hoặc tạo mới
    // Ở đây ta tạo mới để đảm bảo số tiền 'conLai' là mới nhất
    
    // Tạo mã đơn hàng độc nhất dạng SỐ nguyên cho PayOS (PayOS yêu cầu number)
    // Sử dụng 6 số cuối của timestamp + 4 số ngẫu nhiên
    const orderCode = Number(String(Date.now()).slice(-7) + Math.floor(Math.random() * 1000));
    
    // Cập nhật hóa đơn với orderCode này để webhook đối soát
    hoaDon.paymentOrderId = String(orderCode);
    
    // Tạo link thanh toán
    const body = {
      orderCode: orderCode,
      amount: hoaDon.conLai, // Thanh toán số tiền còn lại
      description: `TT PHONG ${hoaDon.maHoaDon.slice(-10)}`, // Tối đa 25 ký tự, không dấu
      returnUrl: `${origin}/dashboard/hoa-don?payment=success&orderCode=${orderCode}`,
      cancelUrl: `${origin}/dashboard/hoa-don?payment=cancel&orderCode=${orderCode}`,
    };

    console.log('[PAYOS] Creating payment link for HoaDon:', hoaDon.maHoaDon, 'Amount:', hoaDon.conLai);

    const paymentLinkRes = await payOS.createPaymentLink(body);
    
    hoaDon.checkoutUrl = paymentLinkRes.checkoutUrl;
    await hoaDon.save();

    return NextResponse.json({
      success: true,
      checkoutUrl: paymentLinkRes.checkoutUrl,
      orderCode: orderCode,
      message: 'Khởi tạo link thanh toán thành công'
    });
  } catch (error) {
    console.error('Error creating PayOS payment link for invoice:', error);
    return NextResponse.json({ 
        message: 'Lỗi khởi tạo cổng thanh toán. Bạn vui lòng thử lại sau hoặc liên hệ hỗ trợ nhé!',
        error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
