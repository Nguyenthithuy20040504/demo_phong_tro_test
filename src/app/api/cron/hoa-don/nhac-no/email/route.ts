import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import mongoose from 'mongoose';
import { sendDebtNotificationEmail, isValidEmail } from '@/lib/mail';
import { getOwnerByHoaDon, getVietQrUrl } from '@/lib/payment-utils';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: 'Unauthorized cron trigger' }, { status: 401 });
    }

    await connectToDatabase();

    const KhachThueModel = mongoose.models.KhachThue || mongoose.model('KhachThue', (KhachThue as any).schema);
    const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung', (NguoiDung as any).schema);

    // Lấy cài đặt nhắc nợ Email từ tất cả Chủ nhà
    const allLandlords = await NguoiDungModel.find({ 
        vaiTro: 'chuNha',
        'caiDatThongBao.tuDongNhacNo': true 
    }).lean();
    
    const mapLandlordSettings = new Map();
    for (const landlord of allLandlords as any) {
        mapLandlordSettings.set(landlord._id.toString(), {
            cooldown: landlord.caiDatThongBao?.thoiGianNhacNoEmail ?? 1440,
            enabled: landlord.caiDatThongBao?.tuDongNhacNo ?? false
        });
    }

    const now = new Date();
    const globalCooldownMinutes = parseInt(process.env.EMAIL_RESEND_COOLDOWN_MINUTES || '1440', 10);

    const allOverdue = await HoaDon.find({
      conLai: { $gt: 0 },
      hanThanhToan: { $lt: now },
      $or: [
        { soLanGuiEmailNhacNoThatBai: { $exists: false } },
        { soLanGuiEmailNhacNoThatBai: { $lt: 3 } }
      ]
    })
    .populate({
      path: 'phong',
      select: 'toaNha',
      populate: { path: 'toaNha', select: 'chuSoHuu' }
    })
    .populate('hopDong', 'snapshotKhachThue');

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const hoaDon of allOverdue) {
      try {
        let cdMinutes = globalCooldownMinutes;
        let isAutoEnabled = false;

        const rPhong = hoaDon.phong as any;
        if (rPhong && rPhong.toaNha && rPhong.toaNha.chuSoHuu) {
           const ownerIdStr = rPhong.toaNha.chuSoHuu.toString();
           if (mapLandlordSettings.has(ownerIdStr)) {
              const settings = mapLandlordSettings.get(ownerIdStr);
              cdMinutes = settings.cooldown;
              isAutoEnabled = settings.enabled;
           }
        }

        if (!isAutoEnabled) {
           skippedCount++;
           continue;
        }

        if (hoaDon.ngayGuiEmailNhacNoCuoi) {
           const minAllowedTime = new Date(now.getTime() - cdMinutes * 60 * 1000);
           if (new Date(hoaDon.ngayGuiEmailNhacNoCuoi).getTime() >= minAllowedTime.getTime()) {
               continue;
           }
        }

        let emailToSend = '';
        let khachThueName = 'Khách thuê';

        const kt = await KhachThueModel.findById(hoaDon.khachThue).lean() as any;
        if (kt) {
          emailToSend = kt.email || '';
          khachThueName = kt.hoTen;
        } else {
          const nd = await NguoiDungModel.findById(hoaDon.khachThue).lean() as any;
          if (nd) {
            emailToSend = nd.email || '';
            khachThueName = nd.ten || nd.name || 'Khách thuê';
          }
        }

        if (!emailToSend && hoaDon.hopDong && (hoaDon.hopDong as any).snapshotKhachThue) {
           const snapList = (hoaDon.hopDong as any).snapshotKhachThue;
           const match = snapList.find((s: any) => s.id === hoaDon.khachThue.toString());
           if (match) {
              emailToSend = match.email || '';
              khachThueName = match.hoTen || match.name || khachThueName;
           }
        }

        if (!emailToSend || !isValidEmail(emailToSend)) {
          failedCount++;
          await HoaDon.findByIdAndUpdate(hoaDon._id, { $inc: { soLanGuiEmailNhacNoThatBai: 1 } });
          continue;
        }

        const owner = await getOwnerByHoaDon(hoaDon) as any;
        let vietQrUrl = hoaDon.checkoutUrl || '';

        if (!vietQrUrl && owner && owner.thongTinThanhToan) {
            vietQrUrl = await getVietQrUrl(hoaDon.conLai, hoaDon.maHoaDon, owner.thongTinThanhToan);
        }

        const success = await sendDebtNotificationEmail({
          email: emailToSend,
          khachThueName,
          hoaDonData: hoaDon.toObject(),
          qrUrl: vietQrUrl,
          ccEmail: owner?.email
        });

        if (success) {
          sentCount++;
          await HoaDon.findByIdAndUpdate(hoaDon._id, {
            $inc: { lanGuiEmailNhacNo: 1 },
            $set: { soLanGuiEmailNhacNoThatBai: 0, ngayGuiEmailNhacNoCuoi: new Date() }
          });
          if (owner?._id) {
             await NguoiDungModel.findByIdAndUpdate(owner._id, {
               'caiDatThongBao.ngayGuiThongBaoCuoi': new Date()
             });
          }
        } else {
          failedCount++;
          await HoaDon.findByIdAndUpdate(hoaDon._id, { $inc: { soLanGuiEmailNhacNoThatBai: 1 } });
        }
      } catch (err: any) {
        failedCount++;
        if (hoaDon?._id) {
           await HoaDon.findByIdAndUpdate(hoaDon._id, { $inc: { soLanGuiEmailNhacNoThatBai: 1 } });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email Cron executed. ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped.`
    });

  } catch (error: any) {
    console.error('Error in Email Cron api:', error);
    return NextResponse.json({ message: 'Internal error', details: error.message }, { status: 500 });
  }
}
