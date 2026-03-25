import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const query = { nguoiNhan: userId };
    const total = await ThongBao.countDocuments(query);

    const notifications = await ThongBao.find(query)
      .populate('nguoiGui', 'ten name email')
      .sort({ ngayGui: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Add isRead flag for each notification
    const notificationsWithRead = notifications.map(n => ({
      ...n,
      isRead: (n.daDoc as mongoose.Types.ObjectId[]).some(id => id.toString() === session.user.id),
    }));

    return NextResponse.json({
      success: true,
      data: notificationsWithRead,
      unreadCount: notificationsWithRead.filter(n => !n.isRead).length,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Error fetching my notifications:', err);
    return NextResponse.json({ success: false, message: 'Lỗi tải thông báo' }, { status: 500 });
  }
}
