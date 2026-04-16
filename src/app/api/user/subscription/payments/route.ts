import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SaaSPayment from '@/models/SaaSPayment';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Convert to ObjectId and fetch payments
    const userId = new mongoose.Types.ObjectId(session.user.id);
    
    const payments = await SaaSPayment.find({ chuNha: userId })
      .populate('goiDichVu', 'ten thoiGian maxPhong gia')
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error('Error fetching landlord saas payments:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
