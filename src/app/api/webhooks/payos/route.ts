import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';
import SaasPayment from '@/models/SaaSPayment';
import HoaDon from '@/models/HoaDon';
import ThanhToan from '@/models/ThanhToan';
import ToaNha from '@/models/ToaNha';
import ThongBao from '@/models/ThongBao';
import payOS from '@/lib/payos';
import { activateSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Bước 1: Xác thực chữ ký bảo mật từ PayOS ──
    let webhookData;
    try {
      webhookData = payOS.verifyPaymentWebhookData(body);
    } catch (e) {
      console.error('PayOS webhook chữ ký bảo mật sai!', e);
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 400 });
    }

    // ── Bước 2: Chỉ xử lý khi tiền đã về (code = 00) ──
    if (webhookData.code !== '00') {
      return NextResponse.json({ success: true });
    }

    const orderCode = webhookData.orderCode;
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════════
    //  A) THANH TOÁN GÓI DỊCH VỤ (SaaS)
    // ═══════════════════════════════════════════════════════════════════
    const payment = await SaasPayment.findOne({
      maDonHang: Number(orderCode),
      $or: [
        { trangThai: 'choDuyet' },
        { trangThai: 'chuaThanhToanHet' },
        { trangThai: 'daThanhToan', ngayHetHanMoi: null },
      ],
    });

    if (payment) {
      // ── Cộng dồn tiền khách vừa chuyển ──
      const amountPaid = webhookData.amount || 0;
      payment.soTienDaChuyen = (payment.soTienDaChuyen || 0) + amountPaid;

      if (payment.soTienDaChuyen < payment.soTien) {
        // Chưa đủ tiền → lưu trạng thái tạm
        payment.trangThai = 'chuaThanhToanHet';
        await payment.save();
        console.log(
          `[PAYOS SAAS] Partial payment (${payment.soTienDaChuyen}/${payment.soTien}) for Order ${orderCode}`,
        );
        return NextResponse.json({ success: true, message: 'Partial payment received' });
      }

      // ── Đủ tiền → lưu số tiền rồi kích hoạt gói ──
      await payment.save();

      const result = await activateSubscription(payment._id.toString());

      if (!result.alreadyProcessed) {
        // Tạo thông báo cho Chủ nhà
        const admin = await NguoiDung.findOne({
          $or: [{ vaiTro: 'admin' }, { role: 'admin' }],
        }).select('_id');
        const senderId = admin ? admin._id : result.userId;

        await ThongBao.create({
          tieuDe: `Xác nhận thanh toán gói ${result.planName} thành công`,
          noiDung:
            `Kính gửi ${result.userName},\n\n` +
            `Khoản thanh toán qua mã QR (Order: ${orderCode}) cho gói dịch vụ ${result.planName} ` +
            `của bạn đã được xác nhận tự động. ` +
            `Hệ thống đã gia hạn và kích hoạt các tính năng đến ngày ${result.newExpiry.toLocaleDateString('vi-VN')}.\n\n` +
            `Cảm ơn bạn đã tin tưởng và sử dụng hệ thống PiRoom!\n\nTrân trọng.`,
          loai: 'thanh_toan_saas',
          nguoiGui: senderId,
          nguoiNhan: [result.userId],
          daDoc: [],
          guiTatCa: false,
        });

        // Tạo thông báo cho Admin
        if (admin) {
          await ThongBao.create({
            tieuDe: `Biến động số dư: ${result.userName} gia hạn SaaS`,
            noiDung:
              `Chủ trọ ${result.userName} (${result.userEmail}) vừa thanh toán thành công ` +
              `qua mã QR PayOS (Order: ${orderCode}) cho gói dịch vụ ${result.planName}.\n` +
              `Khoản tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountPaid)} ` +
              `đã được cộng vào tài khoản.\n` +
              `Hệ thống đã tự động gia hạn thành công đến ngày ${result.newExpiry.toLocaleDateString('vi-VN')}.`,
            loai: 'thanh_toan_saas',
            nguoiGui: result.userId,
            nguoiNhan: [admin._id],
            daDoc: [],
            guiTatCa: false,
          });
        }

        console.log(
          `[PAYOS WEBHOOK] ✓ Auto-renewed ${result.planDuration}mo for ${result.userEmail} via Bank Transfer`,
        );
      }

      return NextResponse.json({ success: true });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  B) THANH TOÁN HÓA ĐƠN PHÒNG (HoaDon khách thuê)
    // ═══════════════════════════════════════════════════════════════════
    const hoaDon = await HoaDon.findOne({
      paymentOrderId: String(orderCode),
      trangThai: { $ne: 'daThanhToan' },
    }).populate('phong');

    if (hoaDon) {
      const amountPaid = webhookData.amount || hoaDon.conLai;

      hoaDon.daThanhToan += amountPaid;
      hoaDon.conLai = hoaDon.tongTien - hoaDon.daThanhToan;
      hoaDon.trangThai = hoaDon.conLai <= 0 ? 'daThanhToan' : 'daThanhToanMotPhan';
      await hoaDon.save();

      // Tạo biên lai thanh toán
      let nguoiNhanId = hoaDon.khachThue;
      try {
        if (hoaDon.phong && hoaDon.phong.toaNha) {
          const toaNha = await ToaNha.findById(hoaDon.phong.toaNha);
          if (toaNha?.chuSoHuu) nguoiNhanId = toaNha.chuSoHuu;
        }
      } catch (e) {
        console.error('Lỗi lấy chủ nhà cho hóa đơn webhook:', e);
      }

      const newThanhToan = new ThanhToan({
        hoaDon: hoaDon._id,
        soTien: amountPaid,
        phuongThuc: 'chuyenKhoan',
        thongTinChuyenKhoan: { nganHang: 'PayOS Gateway', soGiaoDich: String(orderCode) },
        ngayThanhToan: new Date(),
        nguoiNhan: nguoiNhanId,
        ghiChu: 'Thanh toán tự động qua cổng PayOS',
        trangThai: 'daDuyet',
      });
      await newThanhToan.save();

      console.log(
        `[PAYOS WEBHOOK] ✓ Invoice ${hoaDon.maHoaDon} updated via Bank Transfer. Receipt saved.`,
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'Đã xử lý hoặc không hợp lệ' });
  } catch (error) {
    console.error('Webhook PayOS bị lỗi không mong muốn:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
