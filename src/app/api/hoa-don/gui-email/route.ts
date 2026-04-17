import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import HopDong from '@/models/HopDong';
import mongoose from 'mongoose';
import { sendDebtNotificationEmail, isValidEmail } from '@/lib/mail';
import { isToaNhaAccessible } from '@/lib/auth-utils';
import { getOwnerByHoaDon, getVietQrUrl } from '@/lib/payment-utils';
import ThongBao from '@/models/ThongBao';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { hoaDonIds } = await request.json();
    if (!hoaDonIds || !Array.isArray(hoaDonIds) || hoaDonIds.length === 0) {
      return NextResponse.json({ message: 'Danh sách hóa đơn không hợp lệ' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Khởi tạo các model để tránh lỗi khi lookup
    const KhachThueModel = mongoose.models.KhachThue || mongoose.model('KhachThue', KhachThue.schema);
    const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung', NguoiDung.schema);

    const invoices = await HoaDon.find({ _id: { $in: hoaDonIds } })
      .populate('phong', 'toaNha')
      .populate('hopDong', 'snapshotKhachThue');

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const hoaDon of invoices) {
      if (hoaDon.conLai <= 0) {
        failedCount++;
        errors.push(`Hóa đơn ${hoaDon.maHoaDon} đã thanh toán đủ.`);
        continue;
      }
      if (hoaDon.soLanGuiEmailNhacNoThatBai >= 3) {
        failedCount++;
        errors.push(`Hóa đơn ${hoaDon.maHoaDon} đã gửi lỗi quá 3 lần. Ngưng gửi để tránh spam.`);
        continue;
      }

      // Ủy quyền quyền: Kiểm tra tòa nhà
      const toaNhaId = (hoaDon.phong as any)?.toaNha;
      if (toaNhaId) {
        const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
        if (!hasAccess) {
          failedCount++;
          errors.push(`Không có quyền quản lý hóa đơn ${hoaDon.maHoaDon}.`);
          continue;
        }
      }

      // Lấy thông tin khách thuê và email/sdt
      let emailToSend = '';
      let phoneToSend = '';
      let khachThueName = 'Khách thuê';

      const kt = await KhachThueModel.findById(hoaDon.khachThue).lean() as any;
      if (kt) {
        emailToSend = kt.email || '';
        phoneToSend = kt.soDienThoai || '';
        khachThueName = kt.hoTen;
      } else {
        const nd = await NguoiDungModel.findById(hoaDon.khachThue).lean() as any;
        if (nd) {
          emailToSend = nd.email || '';
          phoneToSend = nd.soDienThoai || nd.phone || '';
          khachThueName = nd.ten || nd.name || 'Khách thuê';
        }
      }

      // Check snapshot phòng nếu chưa có email
      if (!emailToSend && hoaDon.hopDong && (hoaDon.hopDong as any).snapshotKhachThue) {
         const snapList = (hoaDon.hopDong as any).snapshotKhachThue;
         const match = snapList.find((s: any) => s.id === hoaDon.khachThue.toString());
         if (match) {
            emailToSend = match.email || '';
            phoneToSend = match.soDienThoai || match.phone || phoneToSend;
            khachThueName = match.hoTen || match.name || khachThueName;
         }
      }

      if (!emailToSend) {
        failedCount++;
        errors.push(`Không tìm thấy Email hợp lệ cho hóa đơn ${hoaDon.maHoaDon}. Vui lòng cập nhật email của Người thuê.`);
        continue;
      }

      // 3. VietQR logic: Tự động tạo link VietQR nếu chưa có checkoutUrl
      const owner = await getOwnerByHoaDon(hoaDon) as any;
      let qrUrl = hoaDon.checkoutUrl || '';
      
      if (!qrUrl && owner && owner.thongTinThanhToan) {
          qrUrl = await getVietQrUrl(hoaDon.conLai, hoaDon.maHoaDon, owner.thongTinThanhToan);
      }

      // 4. Send Email
      const success = await sendDebtNotificationEmail({
        email: emailToSend,
        khachThueName,
        hoaDonData: hoaDon.toObject(),
        qrUrl: qrUrl,
        ccEmail: owner?.email
      });

      if (success) {
        sentCount++;
        await HoaDon.findByIdAndUpdate(hoaDon._id, {
          $inc: { lanGuiEmailNhacNo: 1 },
          $set: { ngayGuiEmailNhacNoCuoi: new Date(), soLanGuiEmailNhacNoThatBai: 0 }
        });

        // 5. Create System Notification
        await ThongBao.create({
          tieuDe: `Thông báo nhắc nợ hóa đơn ${hoaDon.maHoaDon}`,
          noiDung: `Chào ${khachThueName}, bạn có khoản thanh toán hóa đơn tháng ${hoaDon.thang}/${hoaDon.nam} cho phòng ${hoaDon.phong?.maPhong || 'N/A'} vẫn đang chờ xử lý. Số tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hoaDon.conLai)}. Vui lòng kiểm tra và thanh toán sớm.`,
          loai: 'hoaDon',
          nguoiGui: session.user.id,
          nguoiNhan: [hoaDon.khachThue],
          phong: [hoaDon.phong._id],
          daDoc: [],
          guiTatCa: false,
          vaiTroNhan: 'khachThue'
        });
      } else {
        failedCount++;
        await HoaDon.findByIdAndUpdate(hoaDon._id, {
          $inc: { soLanGuiEmailNhacNoThatBai: 1 }
        });
        errors.push(`Lỗi kết nối SMTP/Mail cho hóa đơn ${hoaDon.maHoaDon}.`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi thành công ${sentCount} email. Thất bại: ${failedCount}.`,
      sentCount,
      failedCount,
      errors
    });

  } catch (error: any) {
    console.error('Error in send-email api:', error);
    return NextResponse.json({ message: 'Internal server error', details: error.message }, { status: 500 });
  }
}
