import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';
import ToaNha from '@/models/ToaNha';
import Phong from '@/models/Phong';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await NguoiDung.findOne({ email: session.user.email }).populate('goiDichVuId');
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Calculate Limit and Usage
    let maxPhong = -1; // Default unlimited
    let currentRoomCount = 0;
    let hasPostingFeature = true;

    if (user.role === 'chuNha') {
      let plan = null;
      if (user.goiDichVuId) {
        plan = user.goiDichVuId; // populated
      } else {
        // Map common internal slugs to database names for better fallback matching
        const slugMap: { [key: string]: string } = {
          'mienPhi': 'Miễn Phí',
          'coBan': 'Cơ Bản',
          'chuyenNghiep': 'Chuyên Nghiệp'
        };
        const searchName = slugMap[user.goiDichVu] || user.goiDichVu;
        // Fallback search by label
        plan = await GoiDichVu.findOne({ ten: { $regex: searchName, $options: 'i' } });
      }

      if (plan) {
        maxPhong = plan.maxPhong;
        hasPostingFeature = plan.hasPostingFeature ?? true;
      } else {
        // Default hardcoded fallbacks - updated to match current system defaults
        if (user.goiDichVu === 'mienPhi') maxPhong = 2;
        else if (user.goiDichVu === 'coBan') maxPhong = 20;
      }

      // Count all rooms
      const userBuildings = await ToaNha.find({ chuSoHuu: user._id }).select('_id');
      const buildingIds = userBuildings.map(b => b._id);
      currentRoomCount = await Phong.countDocuments({ toaNha: { $in: buildingIds } });
    }

    return NextResponse.json({
      success: true,
      hasPostingFeature,
      maxPhong,
      currentRoomCount
    });
  } catch (error: any) {
    console.error('Error fetching features:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
