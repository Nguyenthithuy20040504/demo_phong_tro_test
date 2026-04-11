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
    const userIdObj = new mongoose.Types.ObjectId(session.user.id);
    const userIdStr = session.user.id;

    // Tìm các ID liên kết (KhachThue vs NguoiDung)
    const KhachThue = (await import('@/models/KhachThue')).default;
    let khachThueRecord = await KhachThue.findById(userIdStr);
    if (!khachThueRecord && session.user.phone) {
      khachThueRecord = await KhachThue.findOne({ soDienThoai: session.user.phone });
    }
    if (!khachThueRecord && session.user.email) {
      khachThueRecord = await KhachThue.findOne({ email: session.user.email });
    }

    const linkedIds = [userIdObj];
    if (khachThueRecord && khachThueRecord._id.toString() !== userIdStr) {
      linkedIds.push(new mongoose.Types.ObjectId(khachThueRecord._id.toString()));
    }

    if (markAll) {
      // Mark all linked and broadcast notifications as read
      await ThongBao.updateMany(
        { 
          $or: [
            { nguoiNhan: { $in: linkedIds } },
            { 
              guiTatCa: true, 
              vaiTroNhan: { $in: [session.user.role, 'all'] } 
            }
          ],
          daDoc: { $nin: [userIdObj] } 
        },
        { $addToSet: { daDoc: userIdObj } }
      );
      return NextResponse.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 });
    }

    await ThongBao.updateOne(
      { 
        _id: id, 
        $or: [
          { nguoiNhan: { $in: linkedIds } },
          { 
            guiTatCa: true, 
            vaiTroNhan: { $in: [session.user.role, 'all'] } 
          }
        ]
      },
      { $addToSet: { daDoc: userIdObj } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
