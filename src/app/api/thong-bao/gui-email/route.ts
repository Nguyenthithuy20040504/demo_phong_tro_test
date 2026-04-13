import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import KhachThue from '@/models/KhachThue';
import { sendGeneralNotificationEmail } from '@/lib/mail';
import { getVietQrUrl } from '@/lib/payment-utils';
import HoaDon from '@/models/HoaDon';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { thongBaoId } = await request.json();
    if (!thongBaoId) {
      return NextResponse.json({ message: 'ID thông báo là bắt buộc' }, { status: 400 });
    }

    await dbConnect();
    const NguoiDung = (await import('@/models/NguoiDung')).default;

    // 1. Lấy thông tin thông báo
    const thongBao = await ThongBao.findById(thongBaoId);
    if (!thongBao) {
      return NextResponse.json({ message: 'Không tìm thấy thông báo' }, { status: 404 });
    }

    // 2. Lấy danh sách người nhận từ cả 2 bảng KhachThue và NguoiDung
    const [tenants, staff] = await Promise.all([
      KhachThue.find({ _id: { $in: thongBao.nguoiNhan } }),
      NguoiDung.find({ _id: { $in: thongBao.nguoiNhan } })
    ]);

    const recipientsMap = new Map<string, string>();
    tenants.forEach(t => { if (t.email) recipientsMap.set(t.email.toLowerCase(), t.hoTen); });
    staff.forEach(s => { if (s.email) recipientsMap.set(s.email.toLowerCase(), s.hoTen || s.name); });

    const recipients = Array.from(recipientsMap.entries()).map(([email, name]) => {
      // Tìm ID tương ứng với email để sau này tra cứu hóa đơn
      const tenantMatch = tenants.find(t => t.email?.toLowerCase() === email);
      const staffMatch = staff.find(s => s.email?.toLowerCase() === email);
      return { 
        email, 
        name, 
        id: tenantMatch?._id || staffMatch?._id 
      };
    });

    if (recipients.length === 0) {
      return NextResponse.json({ message: 'Không có người nhận hợp lệ có email' }, { status: 400 });
    }

    // 3. Lấy thông tin người gửi (Chủ nhà) để lấy QR
    const sender = await NguoiDung.findById(session.user.id);
    const ownerPaymentInfo = sender?.thongTinThanhToan;

    // 4. Gửi email cho từng người
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      let qrUrl = '';
      let additionalContent = '';

      // Chỉ tạo QR khi là thông báo hóa đơn
      if (thongBao.loai === 'hoaDon') {
        const latestInvoice = await HoaDon.findOne({
          khachThue: { $in: [
            // Tìm theo ID người dùng hoặc ID khách thuê liên kết
            new (require('mongoose').Types.ObjectId)(recipient.id),
            ...(tenants.filter(t => t.email?.toLowerCase() === recipient.email).map(t => t._id))
          ] },
          trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] }
        }).sort({ ngayTao: -1 });

        if (latestInvoice && ownerPaymentInfo) {
          qrUrl = await getVietQrUrl(latestInvoice.conLai, latestInvoice.maHoaDon, ownerPaymentInfo);
          additionalContent = `\n(Thông tin hóa đơn: ${latestInvoice.maHoaDon}, Số dư nợ: ${latestInvoice.conLai.toLocaleString('vi-VN')}đ)`;
        } else if (ownerPaymentInfo) {
          // Nếu không tìm thấy hóa đơn cụ thể, hiện QR với số tiền 0
          qrUrl = await getVietQrUrl(0, 'THANH TOAN', ownerPaymentInfo);
        }
      }
      // Thông báo chung/sự cố/hợp đồng/hệ thống: KHÔNG hiển thị QR

      const success = await sendGeneralNotificationEmail({
        email: recipient.email!,
        khachThueName: recipient.name,
        tieuDe: thongBao.tieuDe,
        noiDung: thongBao.noiDung + additionalContent,
        qrUrl
      });
      if (success) successCount++;
      else failCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi xong. Thành công: ${successCount}, Thất bại: ${failCount}`,
      summary: { success: successCount, fail: failCount }
    });

  } catch (error: any) {
    console.error('Error in gui-email API:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
