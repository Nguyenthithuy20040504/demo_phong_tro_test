import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';

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
          msg += `• P.${p.tenPhong} - ${(p.toaNha as any)?.tenToaNha || 'Trống'}\n`;
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

  // Lệnh /baocao (Sẽ cập nhật chi tiết logic tính doanh thu sau)
  bot.command('baocao', async (ctx) => {
    ctx.reply('🚧 Tính năng báo cáo nhanh đang được phát triển. Bạn vui lòng quay lại sau nhé!');
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
