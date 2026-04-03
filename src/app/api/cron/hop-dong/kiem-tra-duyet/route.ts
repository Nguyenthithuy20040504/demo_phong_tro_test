import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import ThongBao from '@/models/ThongBao';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import NguoiDung from '@/models/NguoiDung';

export async function GET(request: NextRequest) {
  try {
    // Basic authorization check (similar to existing cron)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: 'Unauthorized cron trigger' }, { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();
    
    // Find all pending contracts
    const pendingContracts = await HopDong.find({ trangThai: 'choDuyet' })
      .populate({
        path: 'phong',
        select: 'maPhong toaNha',
        populate: {
          path: 'toaNha',
          select: 'chuSoHuu tenToaNha',
        }
      });

    let reminderCount = 0;
    let cancelledCount = 0;

    for (const hd of pendingContracts) {
      if (!hd.ngayTao) continue;

      const diffMs = now.getTime() - new Date(hd.ngayTao).getTime();
      const daysSinceCreation = diffMs / (1000 * 60 * 60 * 24);

      // Extract references for notifications
      const nguoiDaiDienId = hd.nguoiDaiDien;
      const rPhong = hd.phong as any;
      const landlordId = rPhong?.toaNha?.chuSoHuu;

      if (daysSinceCreation >= 7) {
        // Hủy bỏ hợp đồng sau 7 ngày chờ duyệt
        hd.trangThai = 'daHuy';
        await hd.save();
        
        // Gửi thông báo cho khách thuê
        if (nguoiDaiDienId && landlordId) {
          const tbKhach = new ThongBao({
            tieuDe: 'Hợp đồng đã bị hủy tự động',
            noiDung: `Hợp đồng phòng ${rPhong?.maPhong || ''} đã tự động bị hủy do quá hạn 7 ngày nhưng chưa được xác nhận.`,
            loai: 'hopDong',
            nguoiGui: landlordId, 
            nguoiNhan: [nguoiDaiDienId],
            phong: rPhong?._id ? [rPhong._id] : [],
            toaNha: rPhong?.toaNha?._id,
            ngayGui: new Date()
          });
          await tbKhach.save();
          
          // Gửi thông báo cho chủ nhà
          const tbChuNha = new ThongBao({
            tieuDe: 'Hợp đồng bị hủy do quá hạn',
            noiDung: `Hợp đồng phòng ${rPhong?.maPhong || ''} do bạn vừa tạo đã tự dộng bị hủy vì khách thuê không xác nhận sau 7 ngày.`,
            loai: 'hopDong',
            nguoiGui: landlordId, // system/owner
            nguoiNhan: [landlordId],
            phong: rPhong?._id ? [rPhong._id] : [],
            toaNha: rPhong?.toaNha?._id,
            ngayGui: new Date()
          });
          await tbChuNha.save();
        }
        
        cancelledCount++;
      } else if (daysSinceCreation >= 5 && !hd.daNhacChoDuyet) {
        // Gửi thông báo nhắc nhở ngày thứ 5
        if (nguoiDaiDienId && landlordId) {
          const tbReminder = new ThongBao({
            tieuDe: 'Nhắc nhở xác nhận hợp đồng',
            noiDung: `Hợp đồng phòng ${rPhong?.maPhong || ''} của bạn sẽ bị hủy sau 2 ngày nữa. Vui lòng xác nhận hợp đồng để hoàn tất quá trình thuê.`,
            loai: 'hopDong',
            nguoiGui: landlordId,
            nguoiNhan: hd.khachThueId || [nguoiDaiDienId], // Gửi cho toàn bộ khách thuê trong hợp đồng
            phong: rPhong?._id ? [rPhong._id] : [],
            toaNha: rPhong?.toaNha?._id,
            ngayGui: new Date()
          });
          await tbReminder.save();
          
          hd.daNhacChoDuyet = true;
          await hd.save();
          
          reminderCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked pending contracts. Sent ${reminderCount} reminders. Auto-cancelled ${cancelledCount} contracts.`,
    });

  } catch (error: any) {
    console.error('Error in contract auto-cancel cron:', error);
    return NextResponse.json({ message: 'Internal error', details: error.message }, { status: 500 });
  }
}
