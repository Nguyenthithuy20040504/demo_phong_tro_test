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
    const userId = session.user.id;

    // Tìm các ID liên kết (KhachThue vs NguoiDung)
    const KhachThue = (await import('@/models/KhachThue')).default;
    let khachThueRecord = await KhachThue.findById(userId);
    if (!khachThueRecord && session.user.phone) {
      khachThueRecord = await KhachThue.findOne({ soDienThoai: session.user.phone });
    }
    if (!khachThueRecord && session.user.email) {
      khachThueRecord = await KhachThue.findOne({ email: session.user.email });
    }

    const linkedIds = [new mongoose.Types.ObjectId(userId)];
    if (khachThueRecord && (khachThueRecord._id as any).toString() !== userId) {
      linkedIds.push(new mongoose.Types.ObjectId((khachThueRecord._id as any).toString()));
    }

    const sessionObjId = new mongoose.Types.ObjectId(userId);

    // Count notifications sent to ANY of the linked IDs that haven't been read by the current session user
    const count = await ThongBao.countDocuments({
      $or: [
        { nguoiNhan: { $in: linkedIds } },
        { 
          guiTatCa: true, 
          vaiTroNhan: { $in: [session.user.role, 'all'] } 
        }
      ],
      daDoc: { $nin: [sessionObjId] }
    });

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
