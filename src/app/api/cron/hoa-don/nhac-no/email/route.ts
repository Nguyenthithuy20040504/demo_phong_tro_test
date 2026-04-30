import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import ThongBao from '@/models/ThongBao';
import mongoose from 'mongoose';
import { sendDebtNotificationEmail, isValidEmail } from '@/lib/mail';
import { getOwnerByHoaDon, getVietQrUrl } from '@/lib/payment-utils';
import { bot } from '@/lib/telegram';

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
    const HopDongModel = mongoose.models.HopDong || mongoose.model('HopDong', (HopDong as any).schema);

    // Lấy cài đặt nhắc nợ Email và Telegram từ tất cả Chủ nhà
    const allLandlords = await NguoiDungModel.find({ 
        vaiTro: 'chuNha',
        $or: [
          { 'caiDatThongBao.tuDongNhacNo': true },
          { 'caiDatThongBao.tuDongNhacNoTelegram': true }
        ]
    }).lean();
    
    const mapLandlordSettings = new Map();
    for (const landlord of allLandlords as any) {
        mapLandlordSettings.set(landlord._id.toString(), {
            cooldown: landlord.caiDatThongBao?.thoiGianNhacNoEmail ?? 1440,
            enabled: landlord.caiDatThongBao?.tuDongNhacNo ?? false,
            telegramEnabled: landlord.caiDatThongBao?.tuDongNhacNoTelegram ?? false,
            telegramChatId: landlord.caiDatThongBao?.telegramChatId || null,
            name: landlord.ten || landlord.name || 'Chủ nhà'
        });
    }

    const telegramNotifications = new Map<string, any>();

    const now = new Date();
    const globalCooldownMinutes = parseInt(process.env.EMAIL_RESEND_COOLDOWN_MINUTES || '1440', 10);

    const allOverdue = await HoaDon.find({
      conLai: { $gt: 0 },
      hanThanhToan: { $lte: now },
      $or: [
        { soLanGuiEmailNhacNoThatBai: { $exists: false } },
        { soLanGuiEmailNhacNoThatBai: { $lt: 3 } }
      ]
    })
    .populate({
      path: 'phong',
      select: 'toaNha maPhong',
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
        let isTelegramEnabled = false;
        let ownerChatId = null;
        let ownerName = 'Chủ nhà';
        let ownerIdForTele = null;

        const rPhong = hoaDon.phong as any;
        if (rPhong && rPhong.toaNha && rPhong.toaNha.chuSoHuu) {
           const ownerIdStr = rPhong.toaNha.chuSoHuu.toString();
           if (mapLandlordSettings.has(ownerIdStr)) {
              const settings = mapLandlordSettings.get(ownerIdStr);
              cdMinutes = settings.cooldown;
              isAutoEnabled = settings.enabled;
              isTelegramEnabled = settings.telegramEnabled;
              ownerChatId = settings.telegramChatId;
              ownerName = settings.name;
              ownerIdForTele = ownerIdStr;
           }
        }

        // Bỏ qua nếu cả 2 phương thức đều tắt
        if (!isAutoEnabled && !isTelegramEnabled) {
           skippedCount++;
           continue;
        }

        if (hoaDon.ngayGuiEmailNhacNoCuoi) {
           const minAllowedTime = new Date(now.getTime() - cdMinutes * 60 * 1000);
           if (new Date(hoaDon.ngayGuiEmailNhacNoCuoi).getTime() >= minAllowedTime.getTime()) {
               continue;
           }
        }

        // Tổng hợp cho Telegram
        if (isTelegramEnabled && ownerChatId && ownerIdForTele) {
           if (!telegramNotifications.has(ownerIdForTele)) {
               telegramNotifications.set(ownerIdForTele, {
                   chatId: ownerChatId,
                   name: ownerName,
                   invoices: []
               });
           }
           telegramNotifications.get(ownerIdForTele).invoices.push(hoaDon);
        }

        // Nếu Email không bật, ta cập nhật lại timestamp để tránh Telegram lặp liên tục, rồi skip phần Email
        if (!isAutoEnabled) {
           if (isTelegramEnabled && ownerChatId) {
               await HoaDon.findByIdAndUpdate(hoaDon._id, {
                 $set: { ngayGuiEmailNhacNoCuoi: new Date() }
               });
           }
           skippedCount++; // Tính vào skipped vì phần email không chạy
           continue;
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

          // Create In-App Notification (Independent of email success)
          try {
            const roomName = hoaDon.phong?.maPhong || (hoaDon.phong as any)?.maPhong || 'N/A';
            const noiDungThongBao = `Thông báo quá hạn: Hóa đơn phòng ${roomName} tháng ${hoaDon.thang}/${hoaDon.nam} của bạn đã quá hạn thanh toán. Số tiền còn lại: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hoaDon.conLai)}. Vui lòng hoàn tất thanh toán sớm.`;

            await new ThongBao({
              tieuDe: 'Thông báo nợ (Quá hạn)',
              noiDung: noiDungThongBao,
              loai: 'hoaDon',
              nguoiGui: owner?._id || null,
              nguoiNhan: [hoaDon.khachThue],
              ngayGui: new Date()
            }).save();
          } catch (notifyErr) {
            console.error('Failed to create in-app notification:', notifyErr);
          }
      } catch (err: any) {
        failedCount++;
        if (hoaDon?._id) {
           await HoaDon.findByIdAndUpdate(hoaDon._id, { $inc: { soLanGuiEmailNhacNoThatBai: 1 } });
        }
      }
    }

    // Gửi thông báo tổng hợp quá hạn qua Telegram
    if (telegramNotifications.size > 0 && bot) {
        for (const [ownerId, data] of telegramNotifications.entries()) {
           if (data.chatId && data.invoices.length > 0) {
              const items = data.invoices.slice(0, 10).map((hd: any) => `• P.${hd.phong?.maPhong || 'Trống'}: ${new Intl.NumberFormat('vi-VN').format(hd.conLai)} đ`).join('\n');
              const excess = data.invoices.length > 10 ? `\n_... và ${data.invoices.length - 10} hóa đơn khác._` : '';
              const msg = `🚨 *THÔNG BÁO QUÁ HẠN*\nChào ${data.name}, bạn có *${data.invoices.length} phòng* đang quá hạn thanh toán:\n\n${items}${excess}\n\nVui lòng kiểm tra lại trạng thái thu tiền trên hệ thống Web.`;
              try {
                 await bot.telegram.sendMessage(data.chatId, msg, { parse_mode: 'Markdown' });
              } catch (e: any) {
                 console.error('Lỗi khi gửi Telegram Push Notification cho', ownerId, e.message);
              }
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
