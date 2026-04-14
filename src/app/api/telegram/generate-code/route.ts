import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'chuNha') {
      return NextResponse.json({ error: 'Unauthorized or insufficient permissions' }, { status: 401 });
    }

    await dbConnect();
    
    // Tạo mã 6 chữ số ngẫu nhiên
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 30 * 60000); // 30 minutes

    const userId = (session.user as any).id;
    await NguoiDung.findByIdAndUpdate(
      userId,
      {
        maLienKetTelegram: code,
        hanMaLienKetTelegram: expiry
      }
    );

    return NextResponse.json({ 
      success: true, 
      code,
      message: 'Mã liên kết đã được tạo. Vui lòng nhập mã này vào Telegram trong vòng 30 phút.' 
    });
  } catch (error) {
    console.error('Lỗi khi tạo mã liên kết telegram:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
