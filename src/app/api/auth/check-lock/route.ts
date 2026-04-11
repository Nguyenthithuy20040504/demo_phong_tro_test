import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ locked: true });
    }

    const role = (session.user as any).role;
    
    // Chỉ check chủ nhà / nhân viên (admin không bị lock)
    if (role === 'admin') {
      return NextResponse.json({ locked: false });
    }

    if (role === 'khachThue') {
      return NextResponse.json({ locked: false });
    }

    await dbConnect();
    const dbUser = await NguoiDung.findById(session.user.id).select('trangThai isActive').lean();
    
    if (!dbUser || (dbUser as any).trangThai === 'khoa' || (dbUser as any).isActive === false) {
      return NextResponse.json({ locked: true });
    }

    return NextResponse.json({ locked: false });
  } catch (error) {
    console.error('[check-lock] Error:', error);
    return NextResponse.json({ locked: false });
  }
}
