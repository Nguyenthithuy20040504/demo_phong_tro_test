import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import HoaDon from '@/models/HoaDon';
import ThanhToan from '@/models/ThanhToan';

if (bot) {
  // Lệnh /start để chào mừng hoặc liên kết tài khoản
  bot.command('start', async (ctx) => {
    const text = ctx.message.text;
    const parts = text.split(' ');
    
    // Nếu có mã liên kết theo sau: /start 123456
    if (parts.length > 1) {
      const token = parts[1];
      
      try {
        await dbConnect();
        // Tìm User có mã liên kết trùng khớp
        const user = await NguoiDung.findOne({ maLienKetTelegram: token });
        
        if (!user) {
          return ctx.reply('❌ Mã liên kết không hợp lệ hoặc đã được sử dụng.');
        }
        
        const now = new Date();
        if (user.hanMaLienKetTelegram && now > user.hanMaLienKetTelegram) {
          return ctx.reply('⏱ Mã liên kết đã hết hạn (quá 30 phút). Vui lòng tạo mã mới trên ứng dụng.');
        }
        
        // Liên kết thành công
        user.caiDatThongBao = user.caiDatThongBao || {};
        user.caiDatThongBao.telegramChatId = ctx.chat.id.toString();
        user.caiDatThongBao.tuDongNhacNoTelegram = true;
        
        // Xóa mã cũ để bảo mật
        user.maLienKetTelegram = null;
        user.hanMaLienKetTelegram = null;
        await user.save();
        
        return ctx.reply(
          `✅ Xin chào **${user.ten}**!\n\n` + 
          `Tài khoản của bạn đã được kết nối thành công với Trợ lý PiRoom.\n\n` +
          `Từ giờ tôi sẽ tự động gửi thông báo (nhắc nợ, sự cố) đến đây. Bạn cũng có thể dùng các lệnh sau để tra cứu nhanh:\n\n` +
          `🏠 /phong - Xem tình trạng phòng\n` +
          `💰 /baocao - Xem báo cáo tổng quan`,
          { parse_mode: 'Markdown' }
        );

      } catch (error) {
        console.error('Lỗi khi liên kết telegram:', error);
        return ctx.reply('⚠ Đã xảy ra lỗi hệ thống khi liên kết. Vui lòng thử lại sau.');
      }
    }
    
    // Nếu chỉ gõ /start không có mã
    return ctx.reply(
      `👋 Chào bạn! Tôi là Trợ lý ảo của hệ thống quản lý PiRoom.\n\n` +
      `Để kết nối tài khoản Web của bạn với tôi, hãy làm theo 2 bước sau:\n` +
      `1. Truy cập vào trang web, phần **Cài đặt -> Hồ sơ -> Thông báo**.\n` +
      `2. Nhấn nút "Kết nối Telegram" để lấy **Mã liên kết 6 số**.\n` +
      `3. Quay lại đây và nhập lệnh: \`/start MÃ_SỐ\` (ví dụ: \`/start 123456\`).`,
      { parse_mode: 'Markdown' }
    );
  });

  // Lệnh /phong: Tóm tắt tình trạng số lượng phòng
  bot.command('phong', async (ctx) => {
    try {
      await dbConnect();
      const chatId = ctx.chat.id.toString();
      
      const user = await NguoiDung.findOne({ 'caiDatThongBao.telegramChatId': chatId });
      if (!user) {
        return ctx.reply('❌ Tài khoản của bạn chưa được liên kết. Vui lòng liên kết tài khoản trước.');
      }

      await ToaNha.countDocuments(); // Ensure model registration
      const toaNhas = await ToaNha.find({ chuSoHuu: user._id });
      if (toaNhas.length === 0) {
        return ctx.reply('🏢 Dữ liệu trống. Bạn chưa có tòa nhà nào để quản lý.');
      }
      
      const toaNhaIds = toaNhas.map(t => t._id);
      await Phong.countDocuments(); // Ensure model registration
      const phongs = await Phong.find({ toaNha: { $in: toaNhaIds } }).populate('toaNha', 'tenToaNha');
      
      const emptyCount = phongs.filter((p: any) => p.trangThai === 'trong').length;
      const rentedCount = phongs.filter((p: any) => p.trangThai === 'daThue').length;
      const maintainingCount = phongs.filter((p: any) => p.trangThai === 'baoTri').length;

      let msg = `📊 *TỔNG QUAN PHÒNG TRỌ*\n`;
      msg += `━━━━━━━━━━━━━━\n`;
      msg += `🏢 Tổng số phòng: **${phongs.length}**\n`;
      msg += `🟢 Đang cho thuê: ${rentedCount}\n`;
      msg += `⚪ Phòng trống: ${emptyCount}\n`;
      if (maintainingCount > 0) msg += `🔴 Đang bảo trì: ${maintainingCount}\n`;
      
      // Danh sách một vài phòng trống
      const emptyRooms = phongs.filter((p: any) => p.trangThai === 'trong');
      if (emptyRooms.length > 0) {
        msg += `\n✨ *Danh sách phòng trống:*\n`;
        // Hiển thị tối đa 7 phòng để tin nhắn không quá dài
        emptyRooms.slice(0, 7).forEach((p: any) => {
          msg += `• P.${p.maPhong} - ${(p.toaNha as any)?.tenToaNha || 'Trống'}\n`;
        });
        if (emptyRooms.length > 7) {
          msg += `_... và ${emptyRooms.length - 7} phòng khác_\n`;
        }
      }

      ctx.reply(msg, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Lỗi khi tra cứu phòng qua telegram:', error);
      ctx.reply('⚠ Có lỗi xảy ra khi tra cứu thông tin phòng.');
    }
  });

  // Lệnh /baocao: Báo cáo tài chính nhanh
  bot.command('baocao', async (ctx) => {
    try {
      await dbConnect();
      const chatId = ctx.chat.id.toString();
      const user = await NguoiDung.findOne({ 'caiDatThongBao.telegramChatId': chatId });
      if (!user) return ctx.reply('❌ Bạn chưa liên kết tài khoản.');

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Đảm bảo các model được load
      await ToaNha.countDocuments();
      await HoaDon.countDocuments();

      const buildings = await ToaNha.find({ chuSoHuu: user._id });
      const buildingIds = buildings.map(b => b._id);

      const invoices = await HoaDon.find({
        phong: { $in: await Phong.find({ toaNha: { $in: buildingIds } }).distinct('_id') },
        thang: currentMonth,
        nam: currentYear
      });

      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.tongTien || 0), 0);
      const collected = invoices.reduce((sum, inv) => sum + (inv.daThanhToan || 0), 0);
      const debt = invoices.reduce((sum, inv) => sum + (inv.conLai || 0), 0);

      const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

      let msg = `💰 *BÁO CÁO THÁNG ${currentMonth}/${currentYear}*\n`;
      msg += `━━━━━━━━━━━━━━\n`;
      msg += `💵 Dự kiến thu: *${formatter.format(totalRevenue)}*\n`;
      msg += `✅ Thực thu: *${formatter.format(collected)}*\n`;
      msg += `🔴 Còn nợ: *${formatter.format(debt)}*\n\n`;
      
      msg += `📊 Tình trạng thanh toán:\n`;
      msg += `• Đã trả đủ: ${invoices.filter(i => i.trangThai === 'daThanhToan').length}\n`;
      msg += `• Chưa trả: ${invoices.filter(i => i.trangThai === 'chuaThanhToan' || i.trangThai === 'quaHan').length}\n`;

      ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Lỗi báo cáo Telegram:', error);
      ctx.reply('⚠ Lỗi khi tính toán báo cáo.');
    }
  });

  // Lệnh /thutien [maHoaDon]: Xác nhận thu tiền mặt nhanh
  bot.command('thutien', async (ctx) => {
    try {
      await dbConnect();
      const chatId = ctx.chat.id.toString();
      const user = await NguoiDung.findOne({ 'caiDatThongBao.telegramChatId': chatId });
      if (!user) return ctx.reply('❌ Bạn chưa liên kết tài khoản.');

      // Lấy mã hóa đơn từ tin nhắn (ví dụ: "/thutien HD001" -> "HD001")
      const text = ctx.message.text;
      const maHoaDon = text.split(' ')[1]?.toUpperCase();

      if (!maHoaDon) {
        return ctx.reply('📝 Vui lòng nhập mã hóa đơn. Ví dụ: `/thutien HD12345`', { parse_mode: 'Markdown' });
      }

      // Tìm hóa đơn
      const hoaDon = await HoaDon.findOne({ maHoaDon }).populate({
        path: 'phong',
        populate: { path: 'toaNha' }
      });

      if (!hoaDon) {
        return ctx.reply(`❌ Không tìm thấy hóa đơn mã *${maHoaDon}*.`, { parse_mode: 'Markdown' });
      }

      // Kiểm tra quyền sở hữu
      const rPhong = hoaDon.phong as any;
      if (rPhong?.toaNha?.chuSoHuu?.toString() !== user._id.toString()) {
        return ctx.reply('🚫 Bạn không có quyền xử lý hóa đơn này.');
      }

      if (hoaDon.trangThai === 'daThanhToan') {
        return ctx.reply('✅ Hóa đơn này đã được thanh toán từ trước đó.');
      }

      const soTienThu = hoaDon.conLai;

      // 1. Cập nhật hóa đơn
      hoaDon.daThanhToan = hoaDon.tongTien;
      // Pre-save hook của HoaDon sẽ tự tính conLai = 0 và trangThai = 'daThanhToan'
      await hoaDon.save();

      // 2. Tạo bản ghi ThanhToan
      await new ThanhToan({
        hoaDon: hoaDon._id,
        soTien: soTienThu,
        phuongThuc: 'tienMat',
        nguoiNhan: user._id,
        trangThai: 'daDuyet',
        ghiChu: 'Thu tiền mặt nhanh qua Telegram'
      }).save();

      const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
      ctx.reply(`✅ *THU TIỀN THÀNH CÔNG*\n\n📋 Hóa đơn: *${maHoaDon}*\n🏠 Phòng: *${rPhong.maPhong}*\n💰 Số tiền vừa thu: *${formatter.format(soTienThu)}*\n\nTrạng thái hóa đơn đã được cập nhật thành *Đã thanh toán* trên hệ thống Web.`, { parse_mode: 'Markdown' });

    } catch (error: any) {
      console.error('Lỗi thu tiền Telegram:', error);
      ctx.reply('⚠ Lỗi khi xử lý thu tiền: ' + error.message);
    }
  });
}

// Bắt buộc khai báo dynamic cho API route do đây là điểm endpoint nhận request
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!bot) {
    return NextResponse.json({ error: 'Telegram Bot is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    // Chuyển khối lượng công việc xử lý webhook cho hệ thống Telegraf
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true, message: 'Message handled' });
  } catch (error: any) {
    console.error('Lỗi Webhook Telegram:', error.message);
    return NextResponse.json({ error: 'Failed to handle webhook' }, { status: 500 });
  }
}
