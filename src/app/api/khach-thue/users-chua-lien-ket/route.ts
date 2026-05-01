import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import KhachThue from '@/models/KhachThue';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const NguoiDung = mongoose.model('NguoiDung');

    let nguoiQuanLyId = session.user.id;
    if (session.user.role === 'nhanVien') {
      const nhanVien = await NguoiDung.findById(session.user.id).select('nguoiQuanLy');
      if (nhanVien && nhanVien.nguoiQuanLy) {
        nguoiQuanLyId = nhanVien.nguoiQuanLy.toString();
      }
    }

    // Lấy tất cả KhachThue _id, soDienThoai, email của landlord này
    const allKhachThues = await KhachThue.find({
      nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId)
    }).select('_id soDienThoai email');

    const linkedUserIds = allKhachThues.map(kt => kt._id);
    const linkedPhones = allKhachThues.map(kt => kt.soDienThoai).filter(Boolean);
    const linkedEmails = allKhachThues.map(kt => kt.email?.toLowerCase()).filter(Boolean);

    // Lấy tất cả Khách thuê users của landlord này mà chưa bị liên kết
    // (Không trùng _id, không trùng soDienThoai, không trùng email với bất kỳ KhachThue nào)
    const unlinkedUsers = await NguoiDung.find({
      nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId),
      $or: [{ role: 'khachThue' }, { vaiTro: 'khachThue' }],
      _id: { $nin: linkedUserIds },
      $and: [
        { $or: [{ phone: { $nin: linkedPhones } }, { phone: { $exists: false } }] },
        { $or: [{ soDienThoai: { $nin: linkedPhones } }, { soDienThoai: { $exists: false } }] },
        // Chú ý: email trong NguoiDung lưu thường, cũng cần so khớp case-insensitive nếu được
        // Ở đây đơn giản query bằng chuỗi exact (vì user gõ email chuẩn)
        { email: { $nin: linkedEmails } }
      ]
    }).select('hoTen ten name soDienThoai phone email').lean();

    const formattedUsers = unlinkedUsers.map((user: any) => {
      let displayEmail = user.email || '';
      if (displayEmail.startsWith(`unlinked_${nguoiQuanLyId}_`)) {
        displayEmail = displayEmail.replace(`unlinked_${nguoiQuanLyId}_`, '');
      }
      return {
        _id: user._id,
        hoTen: user.ten || user.name || user.hoTen || '(Trống)',
        soDienThoai: user.soDienThoai || user.phone || '(Trống)',
        email: displayEmail.includes('@no-email.local') ? '' : displayEmail
      };
    });

    return NextResponse.json({ success: true, data: formattedUsers });
  } catch (error) {
    console.error('Error fetching unlinked users:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
