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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { hoaDonIds } = await request.json();
    if (!hoaDonIds || !Array.isArray(hoaDonIds) || hoaDonIds.length === 0) {
      return NextResponse.json({ message: 'Danh s├ích h├│a ─æ╞ín kh├┤ng hß╗úp lß╗ç' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Khß╗ƒi tß║ío c├íc model ─æß╗â tr├ính lß╗ùi khi lookup
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
        errors.push(`H├│a ─æ╞ín ${hoaDon.maHoaDon} ─æ├ú thanh to├ín ─æß╗º.`);
        continue;
      }

      // ß╗ªy quyß╗ün quyß╗ün: Kiß╗âm tra t├▓a nh├á
      const toaNhaId = (hoaDon.phong as any)?.toaNha;
      if (toaNhaId) {
        const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
        if (!hasAccess) {
          failedCount++;
          errors.push(`Kh├┤ng c├│ quyß╗ün quß║ún l├╜ h├│a ─æ╞ín ${hoaDon.maHoaDon}.`);
          continue;
        }
      }

      // Lß║Ñy th├┤ng tin kh├ích thu├¬ v├á email/sdt
      let emailToSend = '';
      let phoneToSend = '';
      let khachThueName = 'Kh├ích thu├¬';

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
          khachThueName = nd.ten || nd.name || 'Kh├ích thu├¬';
        }
      }

      // Check snapshot ph├▓ng nß║┐u ch╞░a c├│ email
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
        errors.push(`Kh├┤ng t├¼m thß║Ñy Email hß╗úp lß╗ç cho h├│a ─æ╞ín ${hoaDon.maHoaDon}. Vui l├▓ng cß║¡p nhß║¡t email cß╗ºa Ng╞░ß╗¥i thu├¬.`);
        continue;
      }

      // 3. VietQR logic: Tß╗▒ ─æß╗Öng tß║ío link VietQR nß║┐u ch╞░a c├│ checkoutUrl
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
        qrUrl: qrUrl
      });

      if (success) {
        sentCount++;
        // Cß║¡p nhß║¡t trß║íng th├íi bß║▒ng findByIdAndUpdate ─æß╗â tr├ính lß╗ùi validation kh├┤ng ─æ├íng c├│
        await HoaDon.findByIdAndUpdate(hoaDon._id, {
          $inc: { lanGuiEmailNhacNo: 1 },
          $set: { ngayGuiEmailNhacNoCuoi: new Date() }
        });
      } else {
        failedCount++;
        errors.push(`Lß╗ùi kß║┐t nß╗æi SMTP/Mail cho h├│a ─æ╞ín ${hoaDon.maHoaDon}.`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `─É├ú gß╗¡i th├ánh c├┤ng ${sentCount} email. Thß║Ñt bß║íi: ${failedCount}.`,
      sentCount,
      failedCount,
      errors
    });

  } catch (error: any) {
    console.error('Error in send-email api:', error);
    return NextResponse.json({ message: 'Internal server error', details: error.message }, { status: 500 });
  }
}
