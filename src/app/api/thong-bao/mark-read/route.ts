import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Mark single notification as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { id, markAll } = await request.json();
    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    if (markAll) {
      // Mark all user's notifications as read
      await ThongBao.updateMany(
        { nguoiNhan: userId, daDoc: { $nin: [userId] } },
        { $addToSet: { daDoc: userId } }
      );
      return NextResponse.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 });
    }

    await ThongBao.updateOne(
      { _id: id, nguoiNhan: userId },
      { $addToSet: { daDoc: userId } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
