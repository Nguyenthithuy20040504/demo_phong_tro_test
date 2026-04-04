import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import mongoose from 'mongoose';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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
    if (khachThueRecord && khachThueRecord._id.toString() !== userId) {
      linkedIds.push(new mongoose.Types.ObjectId(khachThueRecord._id.toString()));
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const query = { nguoiNhan: { $in: linkedIds } };
    const total = await ThongBao.countDocuments(query);

    const notifications = await ThongBao.find(query)
      .populate('nguoiGui', 'ten name email')
      .populate({
        path: 'phong',
        select: 'toaNha maPhong',
      })
      .sort({ ngayGui: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Lấy danh sách tòa nhà người dùng có quyền truy cập để disambiguate phòng trùng tên
    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    
    // Add isRead flag for each notification and auto-resolve building/room ID if missing
    const notificationsWithRead = await Promise.all(notifications.map(async n => {
      let resolvedToaNha = n.toaNha;
      let resolvedPhongId = null;
      let resolvedMaPhong = null;
      
      if (n.phong && (n.phong as any[]).length > 0) {
        const phongObj = (n.phong as any[])[0];
        if (phongObj && typeof phongObj === 'object') {
          resolvedPhongId = phongObj._id;
          resolvedMaPhong = phongObj.maPhong || resolvedMaPhong;
          if (!resolvedToaNha) {
            resolvedToaNha = phongObj.toaNha;
          }
        }
      }

      // TRƯỜNG HỢP FETCH CHƯA ĐỦ THÔNG TIN HOẶC CẦN SỬA LỖI DỮ LIỆU CŨ: Truy vết dựa trên nội dung
      const codeMatch = n.noiDung?.match(/(HD-?[A-Z0-9-]{8,})/i) || n.tieuDe?.match(/(HD-?[A-Z0-9-]{8,})/i);
      
      if (codeMatch) {
         // BƯỚC 1: Dùng mã Hợp Đồng/Hóa Đơn ghi đè mọi thông tin lấy từ DB (vì DB có thể lưu nhầm tòa nhà)
         const code = codeMatch[1];
         // Thử tìm trong HopDong trước
         const hd = await (await dbConnect()).model('HopDong').findOne({ maHopDong: code }).select('phong').lean();
         if (hd && hd.phong) {
            const pObj = await (await dbConnect()).model('Phong').findById(hd.phong).select('toaNha maPhong').lean();
            if (pObj) {
              resolvedToaNha = pObj.toaNha;
              resolvedPhongId = pObj._id;
              resolvedMaPhong = pObj.maPhong;
            }
         } else {
           // Thử tìm trong HoaDon nếu là mã hóa đơn
           const hoaDon = await (await dbConnect()).model('HoaDon').findOne({ maHoaDon: code }).select('phong').lean();
           if (hoaDon && hoaDon.phong) {
              const pObj = await (await dbConnect()).model('Phong').findById(hoaDon.phong).select('toaNha maPhong').lean();
              if (pObj) {
                resolvedToaNha = pObj.toaNha;
                resolvedPhongId = pObj._id;
                resolvedMaPhong = pObj.maPhong;
              }
           }
         }
      }
      
      // BƯỚC 2: Nếu vẫn chưa ra, dùng số phòng để đoán
      if (!resolvedToaNha || !resolvedMaPhong) {
        const titleContentMatch = n.tieuDe?.match(/Phòng (\d+)/i) || n.noiDung?.match(/Phòng (\d+)/i);
        if (titleContentMatch) {
           resolvedMaPhong = resolvedMaPhong || titleContentMatch[1];
           if (accessibleToaNhaIds !== null && !resolvedToaNha) {
              let query: any = {
                maPhong: resolvedMaPhong,
                toaNha: { $in: accessibleToaNhaIds }
              };
              
              const pObjs = await (await dbConnect()).model('Phong').find(query).populate('toaNha', 'tenToaNha').select('toaNha _id');
              if (pObjs.length > 0) {
                let matchedObj = pObjs[0];
                for (const p of pObjs) {
                  if (p.toaNha && ((n.noiDung && n.noiDung.includes(p.toaNha.tenToaNha)) || (n.tieuDe && n.tieuDe.includes(p.toaNha.tenToaNha)))) {
                    matchedObj = p;
                    break;
                  }
                }
                resolvedToaNha = matchedObj.toaNha?._id || matchedObj.toaNha;
                resolvedPhongId = matchedObj._id;
              }
           }
        }
      }

      return {
        ...n,
        toaNha: resolvedToaNha,
        resolvedPhongId,
        resolvedMaPhong,
        isRead: (n.daDoc as mongoose.Types.ObjectId[]).some(id => id.toString() === session.user.id),
      };
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
