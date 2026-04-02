import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import mongoose from 'mongoose';
import { isToaNhaAccessible } from '@/lib/auth-utils';
import { sendSMS } from '@/lib/sms';

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
    
    // Khởi tạo các model
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

      // Kiểm tra quyền
      const toaNhaId = (hoaDon.phong as any)?.toaNha;
      if (toaNhaId) {
        const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
        if (!hasAccess) {
          failedCount++;
          errors.push(`Không có quyền quản lý hóa đơn ${hoaDon.maHoaDon}.`);
          continue;
        }
      }

      // Lấy số điện thoại
      let phoneToSend = '';
      const kt = await KhachThueModel.findById(hoaDon.khachThue).lean() as any;
      if (kt) {
        phoneToSend = kt.soDienThoai || '';
      } else {
        const nd = await NguoiDungModel.findById(hoaDon.khachThue).lean() as any;
        if (nd) {
          phoneToSend = nd.soDienThoai || nd.phone || '';
        }
      }

      // Check snapshot phòng nếu chưa có phone
      if (!phoneToSend && hoaDon.hopDong && (hoaDon.hopDong as any).snapshotKhachThue) {
         const snapList = (hoaDon.hopDong as any).snapshotKhachThue;
         const match = snapList.find((s: any) => s.id === hoaDon.khachThue.toString());
         if (match) {
            phoneToSend = match.soDienThoai || match.phone || '';
         }
      }

      if (!phoneToSend) {
        failedCount++;
        errors.push(`Không tìm thấy Số điện thoại hợp lệ cho hóa đơn ${hoaDon.maHoaDon}.`);
        continue;
      }

      // 4. Send SMS
      const smsContent = `[Phong Tro] Nhac no hoa don ${hoaDon.maHoaDon}. So du: ${hoaDon.conLai.toLocaleString()} VND. Vui long kiem tra email va thanh toan.`;
      const result = await sendSMS(phoneToSend, smsContent);

      if (result.success) {
        sentCount++;
        // Lưu vết vào các trường SMS chuyên biệt
        await HoaDon.findByIdAndUpdate(hoaDon._id, {
          $inc: { lanGuiSmsNhacNo: 1 },
          $set: { soLanGuiSmsNhacNoThatBai: 0, ngayGuiSmsNhacNoCuoi: new Date() }
        });
      } else {
        failedCount++;
        errors.push(`Lỗi gửi SMS cho ${hoaDon.maHoaDon}: ${result.message || 'Lỗi API'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi thành công ${sentCount} SMS. Thất bại: ${failedCount}.`,
      sentCount,
      failedCount,
      errors
    });

  } catch (error: any) {
    console.error('Error in send-sms api:', error);
    return NextResponse.json({ message: 'Internal server error', details: error.message }, { status: 500 });
  }
}
