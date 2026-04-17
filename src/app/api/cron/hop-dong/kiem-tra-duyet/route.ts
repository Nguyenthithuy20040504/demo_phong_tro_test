import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import ThongBao from '@/models/ThongBao';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import NguoiDung from '@/models/NguoiDung';

export async function GET(request: NextRequest) {
  try {
    // Bỏ qua check Authorization để cho phép cron-job.org truy cập tự do
    // Vì đây là luồng tự động dọn dẹp hệ thống nên không có rủi ro bảo mật

    await connectToDatabase();
    const now = new Date();

    // Find all pending contracts or extension requests
    const pendingContracts = await HopDong.find({ 
      trangThai: { $in: ['choDuyet', 'choDuyetGiaHan'] } 
    }).populate({
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
      const isGiaHan = hd.trangThai === 'choDuyetGiaHan';
      // Đối với gia hạn, tính từ ngày cập nhật (ngayCapNhat), đối với HĐ mới tính từ ngày tạo (ngayTao)
      const baseDate = isGiaHan ? (hd.ngayCapNhat || hd.ngayTao) : hd.ngayTao;

      if (!baseDate) continue;

      const diffMs = now.getTime() - new Date(baseDate).getTime();
      const minutesSinceAction = diffMs / (1000 * 60);

      // Extract references for notifications
      const nguoiDaiDienId = hd.nguoiDaiDien;
      const rPhong = hd.phong as any;
      const landlordId = rPhong?.toaNha?.chuSoHuu;

      if (minutesSinceAction >= 7) {
        // XỬ LÝ QUÁ HẠN 7 PHÚT
        if (isGiaHan) {
           // Khôi phục trạng thái cũ cho hợp đồng gia hạn
           const expirationDate = new Date(hd.ngayKetThuc);
           hd.trangThai = now > expirationDate ? 'hetHan' : 'hoatDong';
           hd.ngayKetThucGiaHan = undefined;
        } else {
           // Hủy bỏ hợp đồng mới
           hd.trangThai = 'daHuy';
        }
        
        await hd.save();

        // Gửi thông báo tự động hủy/hết hạn yêu cầu
        if (nguoiDaiDienId && landlordId) {
          const tieuDe = isGiaHan ? 'Yêu cầu gia hạn đã tự động hết hạn' : 'Hợp đồng đã bị hủy tự động';
          const noiDung = isGiaHan 
            ? `Yêu cầu gia hạn phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã hết hạn do bạn không duyệt sau 7 phút. Hợp đồng giữ nguyên thời hạn cũ.`
            : `Hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã tự động bị hủy do quá hạn 7 phút nhưng chưa được xác nhận.`;

          await ThongBao.create({
            tieuDe,
            noiDung,
            loai: 'hopDong',
            nguoiGui: landlordId,
            nguoiNhan: [nguoiDaiDienId],
            phong: rPhong?._id ? [rPhong._id] : [],
            toaNha: rPhong?.toaNha?._id,
            ngayGui: new Date()
          });

          // Thông báo cho chủ nhà
          await ThongBao.create({
            tieuDe: isGiaHan ? 'Yêu cầu gia hạn bị bỏ qua' : 'Hợp đồng bị hủy do quá hạn',
            noiDung: isGiaHan 
              ? `Yêu cầu gia hạn cho phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã quá hạn 7 phút mà khách không duyệt. Yêu cầu đã bị hủy bỏ.`
              : `Hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã tự động bị hủy vì khách thuê không xác nhận sau 7 phút.`,
            loai: 'hopDong',
            nguoiGui: landlordId,
            nguoiNhan: [landlordId],
            phong: rPhong?._id ? [rPhong._id] : [],
            toaNha: rPhong?.toaNha?._id,
            ngayGui: new Date()
          });
        }

        cancelledCount++;
      } else if (minutesSinceAction >= 5 && !hd.daNhacChoDuyet) {
        // NHẮC NHỞ Ở PHÚT THỨ 5 (CÒN 2 PHÚT)
        if (nguoiDaiDienId && landlordId) {
          const tieuDe = isGiaHan ? 'Nhắc nhở duyệt gia hạn' : 'Nhắc nhở xác nhận hợp đồng';
          const noiDung = isGiaHan
            ? `Yêu cầu gia hạn phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) của bạn sẽ hết hiệu lực sau 2 phút nữa. Vui lòng xác nhận ngay để gia hạn.`
            : `Hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) của bạn sẽ bị hủy sau 2 phút nữa. Vui lòng xác nhận hợp đồng để hoàn tất quá trình thuê.`;

          await ThongBao.create({
            tieuDe,
            noiDung,
            loai: 'hopDong',
            nguoiGui: landlordId,
            nguoiNhan: hd.khachThueId || [nguoiDaiDienId],
            phong: rPhong?._id ? [rPhong._id] : [],
            toaNha: rPhong?.toaNha?._id,
            ngayGui: new Date()
          });

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
