import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';

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

    // Default to true if no plan is specified so they can still see it by default
    // or evaluate based on the populated Plan.
    let hasPostingFeature = true;
    
    if (user.goiDichVuId) {
      const plan = user.goiDichVuId as any;
      hasPostingFeature = plan.hasPostingFeature ?? true;
    }

    return NextResponse.json({
      success: true,
      hasPostingFeature
    });
  } catch (error: any) {
    console.error('Error fetching features:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
