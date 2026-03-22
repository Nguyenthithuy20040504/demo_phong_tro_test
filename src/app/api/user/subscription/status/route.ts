import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await NguoiDung.findById(session.user.id);
    
    if (!user) {
      console.log('API Status: User not found for id', session.user.id);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    console.log('API Status: Returning', { goiDichVu: user.goiDichVu, ngayHetHan: user.ngayHetHan });
    return NextResponse.json({
      goiDichVu: user.goiDichVu,
      ngayHetHan: user.ngayHetHan
    });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
