import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import mongoose from 'mongoose';
import { sendSMS } from '@/lib/sms';
import { getOwnerByHoaDon } from '@/lib/payment-utils';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: 'Unauthorized cron trigger' }, { status: 401 });
    }

    await connectToDatabase();

    const KhachThueModel = mongoose.models.KhachThue || mongoose.model('KhachThue', (KhachThue as any).schema);
    const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung', (NguoiDung as any).schema);
    const PhongModel = mongoose.models.Phong || mongoose.model('Phong', (Phong as any).schema);
    const ToaNhaModel = mongoose.models.ToaNha || mongoose.model('ToaNha', (ToaNha as any).schema);

    // Lấy cài đặt nhắc nợ SMS từ tất cả Chủ nhà
    const allLandlords = await NguoiDungModel.find({ 
        vaiTro: 'chuNha',
        'caiDatThongBao.tuDongNhacNoSMS': true 
    }).lean();
    
    const mapLandlordSettings = new Map();
    for (const landlord of allLandlords as any) {
        mapLandlordSettings.set(landlord._id.toString(), {
            cooldown: landlord.caiDatThongBao?.thoiGianNhacNoSMS ?? 1440,
            enabled: landlord.caiDatThongBao?.tuDongNhacNoSMS ?? false
        });
    }

    const now = new Date();
    const globalCooldownMinutes = parseInt(process.env.SMS_RESEND_COOLDOWN_MINUTES || '1440', 10);

    const allOverdue = await HoaDon.find({
      conLai: { $gt: 0 },
      hanThanhToan: { $lt: now },
      $or: [
        { soLanGuiSmsNhacNoThatBai: { $exists: false } },
        { soLanGuiSmsNhacNoThatBai: { $lt: 3 } }
      ]
    })
    .populate({
      path: 'phong',
      select: 'toaNha',
      populate: { path: 'toaNha', select: 'chuSoHuu' }
    });

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

        if (hoaDon.ngayGuiSmsNhacNoCuoi) {
           const minAllowedTime = new Date(now.getTime() - cdMinutes * 60 * 1000);
           if (new Date(hoaDon.ngayGuiSmsNhacNoCuoi).getTime() >= minAllowedTime.getTime()) {
               continue;
           }
        }

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

        if (!phoneToSend && hoaDon.hopDong && (hoaDon.hopDong as any).snapshotKhachThue) {
           const snapList = (hoaDon.hopDong as any).snapshotKhachThue;
           const match = snapList.find((s: any) => s.id === hoaDon.khachThue.toString());
           if (match) {
              phoneToSend = match.soDienThoai || match.phone || '';
           }
        }

        if (!phoneToSend) {
          failedCount++;
          await HoaDon.findByIdAndUpdate(hoaDon._id, { $inc: { soLanGuiSmsNhacNoThatBai: 1 } });
          continue;
        }

        const smsContent = `[Phong Tro] Nhac no hoa don ${hoaDon.maHoaDon}. So du: ${hoaDon.conLai.toLocaleString()} VND. Vui long thanh toan som.`;
        const result = await sendSMS(phoneToSend, smsContent);

        if (result.success) {
          sentCount++;
          await HoaDon.findByIdAndUpdate(hoaDon._id, {
            $inc: { lanGuiSmsNhacNo: 1 },
            $set: { soLanGuiSmsNhacNoThatBai: 0, ngayGuiSmsNhacNoCuoi: new Date() }
          });
          
          const owner = await getOwnerByHoaDon(hoaDon) as any;
          if (owner?._id) {
             await NguoiDungModel.findByIdAndUpdate(owner._id, {
               'caiDatThongBao.ngayGuiThongBaoSMSCuoi': new Date()
             });
          }
        } else {
          failedCount++;
          await HoaDon.findByIdAndUpdate(hoaDon._id, { $inc: { soLanGuiSmsNhacNoThatBai: 1 } });
        }
      } catch (err: any) {
        failedCount++;
        if (hoaDon?._id) {
           await HoaDon.findByIdAndUpdate(hoaDon._id, { $inc: { soLanGuiSmsNhacNoThatBai: 1 } });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `SMS Cron executed. ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped.`
    });

  } catch (error: any) {
    console.error('Error in SMS Cron api:', error);
    return NextResponse.json({ message: 'Internal error', details: error.message }, { status: 500 });
  }
}
