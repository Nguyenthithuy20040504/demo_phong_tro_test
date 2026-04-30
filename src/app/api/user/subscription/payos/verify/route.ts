import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SaasPayment from '@/models/SaaSPayment';
import payOS from '@/lib/payos';
import { activateSubscription } from '@/lib/subscription';
import mongoose from 'mongoose';

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

    const payment = await SaasPayment.findOne({
      maDonHang: orderCode,
      chuNha: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!payment) {
      console.log(
        `Verify API: Payment NOT FOUND for orderCode=${orderCode}, session=${session.user.id}`,
      );
      return NextResponse.json(
        { message: 'Hóa đơn không tồn tại hoặc không phải của bạn' },
        { status: 404 },
      );
    }

    // ── Đã xử lý rồi (webhook hoặc lần verify trước) → trả ngay ──
    if (payment.trangThai === 'daThanhToan' && payment.ngayHetHanMoi !== null) {
      return NextResponse.json({ status: 'PAID' });
    }

    // ── Chưa xử lý → gọi API PayOS tra cứu (dùng cho localhost không có webhook) ──
    const paymentInfo = await payOS.getPaymentLinkInformation(orderCode);

    if (paymentInfo.status === 'PAID') {
      const result = await activateSubscription(payment._id.toString());

      console.log(
        `[PAYOS VERIFY] ${result.alreadyProcessed ? '⏭ Already processed' : '✓ Activated'} ` +
          `for ${result.userEmail}, expiry=${result.newExpiry.toISOString()}`,
      );

      return NextResponse.json({ status: 'PAID' });
    }

    if (paymentInfo.status === 'CANCELLED') {
      payment.trangThai = 'daHuy';
      await payment.save();
      console.log(`[PAYOS VERIFY] Hóa đơn ${orderCode} đã bị khách hàng hủy thanh toán.`);
      return NextResponse.json({ status: 'CANCELLED' });
    }

    return NextResponse.json({ status: paymentInfo.status });
  } catch (error) {
    console.error('Error verifying PayOS payment:', error);
    return NextResponse.json({ message: 'Lỗi tra cứu giao dịch bên PayOS' }, { status: 500 });
  }
}
