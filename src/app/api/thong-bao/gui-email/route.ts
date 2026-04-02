import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import KhachThue from '@/models/KhachThue';
import { sendGeneralNotificationEmail } from '@/lib/mail';

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

    const recipients = Array.from(recipientsMap.entries()).map(([email, name]) => ({ email, name }));

    if (recipients.length === 0) {
      return NextResponse.json({ message: 'Không có người nhận hợp lệ có email' }, { status: 400 });
    }

    // 3. Gửi email cho từng người
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      const success = await sendGeneralNotificationEmail({
        email: recipient.email!,
        khachThueName: recipient.name,
        tieuDe: thongBao.tieuDe,
        noiDung: thongBao.noiDung
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
