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
    const user = await NguoiDung.findById(session.user.id).populate('nguoiQuanLy', 'ngayHetHan goiDichVu').lean() as any;
    
    if (!user) {
      console.log('API Status: User not found for id', session.user.id);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Nếu người dùng là Nhân viên, kế thừa trạng thái từ người quản lý
    let finalGoiDichVu = user.goiDichVu;
    let finalNgayHetHan = user.ngayHetHan;
    
    const roleStr = user.role || user.vaiTro;

    // TỰ ĐỘNG KÍCH HOẠT GÓI ĐỢI (QUEUE SYSTEM)
    // Kích hoạt nếu: 1. Đã hết hạn; HOẶC 2. Gói trong hàng đợi là gói NÂNG CẤP (Tier cao hơn)
    const roleTiers = { 'mienPhi': 0, 'coBan': 1, 'chuyenNghiep': 2 };
    const currentTier = roleTiers[user.goiDichVu as keyof typeof roleTiers] || 0;
    const queuedTier = user.goiDichVuTiepTheo ? roleTiers[user.goiDichVuTiepTheo as keyof typeof roleTiers] || 0 : -1;

    const shouldActivateQueue = roleStr === 'chuNha' && user.goiDichVuTiepTheo && (
      (user.ngayHetHan && new Date(user.ngayHetHan) < new Date()) || // Đã hết hạn
      (queuedTier > currentTier) // Là gói nâng cấp
    );

    if (shouldActivateQueue) {
       console.log('API Status: Activating queued upgrade/expired plan for user', session.user.id);
       const updatedUser = await NguoiDung.findByIdAndUpdate(
         session.user.id,
         { 
           goiDichVu: (user as any).goiDichVuTiepTheo,
           goiDichVuTiepTheo: null 
         },
         { new: true }
       ).lean();
       
       if (updatedUser) {
         user.goiDichVu = updatedUser.goiDichVu;
         user.goiDichVuTiepTheo = null;
         finalGoiDichVu = updatedUser.goiDichVu;
       }
    }

    if (roleStr === 'nhanVien' && user.nguoiQuanLy && (user.nguoiQuanLy as any).ngayHetHan) {
      const nguoiQuanLy = user.nguoiQuanLy as any;
      finalGoiDichVu = nguoiQuanLy.goiDichVu || finalGoiDichVu;
      finalNgayHetHan = nguoiQuanLy.ngayHetHan;
    }

    console.log('API Status: Returning', { goiDichVu: finalGoiDichVu, ngayHetHan: finalNgayHetHan, goiDichVuTiepTheo: (user as any).goiDichVuTiepTheo });
    return NextResponse.json({
      goiDichVu: finalGoiDichVu,
      goiDichVuId: user.goiDichVuId,
      ngayHetHan: finalNgayHetHan,
      goiDichVuTiepTheo: (user as any).goiDichVuTiepTheo
    });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
