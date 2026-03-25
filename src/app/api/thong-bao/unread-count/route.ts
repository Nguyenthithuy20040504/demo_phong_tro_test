import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 });
    }

    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Count notifications sent to this user that they haven't read yet
    const count = await ThongBao.countDocuments({
      nguoiNhan: userId,
      daDoc: { $nin: [userId] }
    });

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
