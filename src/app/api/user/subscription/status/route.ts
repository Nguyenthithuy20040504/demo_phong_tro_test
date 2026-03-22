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
    const user = await NguoiDung.findById(session.user.id).populate('nguoiQuanLy', 'ngayHetHan goiDichVu').lean();
    
    if (!user) {
      console.log('API Status: User not found for id', session.user.id);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Nếu người dùng là Nhân viên, kế thừa trạng thái từ người quản lý
    let finalGoiDichVu = user.goiDichVu;
    let finalNgayHetHan = user.ngayHetHan;
    
    const roleStr = user.role || user.vaiTro;
    if (roleStr === 'nhanVien' && user.nguoiQuanLy && (user.nguoiQuanLy as any).ngayHetHan) {
      const nguoiQuanLy = user.nguoiQuanLy as any;
      finalGoiDichVu = nguoiQuanLy.goiDichVu || finalGoiDichVu;
      finalNgayHetHan = nguoiQuanLy.ngayHetHan;
    }

    console.log('API Status: Returning', { goiDichVu: finalGoiDichVu, ngayHetHan: finalNgayHetHan });
    return NextResponse.json({
      goiDichVu: finalGoiDichVu,
      ngayHetHan: finalNgayHetHan
    });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
