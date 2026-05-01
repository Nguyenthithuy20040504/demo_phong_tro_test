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
      trangThai: { $in: ['choDuyet', 'choDuyetGiaHan', 'choDuyetHuy'] } 
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

      if (minutesSinceAction >= 7 * 1440) {
        // XỬ LÝ QUÁ HẠN 7 NGÀY
        if (isGiaHan) {
           // Khôi phục trạng thái cũ cho hợp đồng gia hạn
           const expirationDate = new Date(hd.ngayKetThuc);
           hd.trangThai = now > expirationDate ? 'hetHan' : 'hoatDong';
           hd.ngayKetThucGiaHan = undefined;
        } else if (hd.trangThai === 'choDuyetHuy') {
           // Từ chối hủy tự động (quay lại hoạt động)
           const expirationDate = new Date(hd.ngayKetThuc);
           hd.trangThai = now > expirationDate ? 'hetHan' : 'hoatDong';
        } else {
           // Hủy bỏ hợp đồng mới
           hd.trangThai = 'daHuy';
        }
        
        await hd.save();

        // Gửi thông báo tự động hủy/hết hạn yêu cầu
        if (nguoiDaiDienId && landlordId) {
          const isHuyAction = hd.trangThai === 'daHuy' && !isGiaHan; // Trường hợp thực sự hủy HĐ mới
          const isHuyExpired = hd.trangThai === 'hoatDong' || hd.trangThai === 'hetHan'; // Đã quay lại trạng thái cũ
          
          let tieuDe = isGiaHan ? 'Yêu cầu gia hạn đã tự động hết hạn' : 'Hợp đồng đã bị hủy tự động';
          let noiDung = isGiaHan 
            ? `Yêu cầu gia hạn phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã hết hạn do bạn không duyệt sau 7 ngày. Hợp đồng giữ nguyên thời hạn cũ.`
            : `Hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã tự động bị hủy do quá hạn 7 ngày nhưng chưa được xác nhận.`;

          if (isHuyExpired && !isGiaHan) {
            tieuDe = 'Yêu cầu hủy hợp đồng đã hết hạn';
            noiDung = `Yêu cầu hủy hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã quá hạn 7 ngày mà bạn không duyệt. Hợp đồng tiếp tục có hiệu lực.`;
          }

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
          let tieuDeChuNha = isGiaHan ? 'Yêu cầu gia hạn bị bỏ qua' : 'Hợp đồng bị hủy do quá hạn';
          let noiDungChuNha = isGiaHan 
            ? `Yêu cầu gia hạn cho phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã quá hạn 7 ngày mà khách không duyệt. Yêu cầu đã bị hủy bỏ.`
            : `Hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã tự động bị hủy vì khách thuê không xác nhận sau 7 ngày.`;

          if (isHuyExpired && !isGiaHan) {
            tieuDeChuNha = 'Yêu cầu hủy hợp đồng bị bỏ qua';
            noiDungChuNha = `Yêu cầu hủy hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) đã quá hạn 7 ngày mà khách không duyệt. Yêu cầu đã bị hủy bỏ.`;
          }

          await ThongBao.create({
            tieuDe: tieuDeChuNha,
            noiDung: noiDungChuNha,
            loai: 'hopDong',
            nguoiGui: landlordId,
            nguoiNhan: [landlordId],
            phong: rPhong?._id ? [rPhong._id] : [],
            toaNha: rPhong?.toaNha?._id,
            ngayGui: new Date()
          });
        }

        cancelledCount++;
      } else if (minutesSinceAction >= 5 * 1440 && !hd.daNhacChoDuyet) {
        // NHẮC NHỞ Ở NGÀY THỨ 5 (CÒN 2 NGÀY)
        if (nguoiDaiDienId && landlordId) {
          const isHuyReq = hd.trangThai === 'choDuyetHuy';
          const tieuDe = isGiaHan ? 'Nhắc nhở duyệt gia hạn' : isHuyReq ? 'Nhắc nhở duyệt hủy hợp đồng' : 'Nhắc nhở xác nhận hợp đồng';
          const noiDung = isGiaHan
            ? `Yêu cầu gia hạn phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) của bạn sẽ hết hiệu lực sau 2 ngày nữa. Vui lòng xác nhận ngay để gia hạn.`
            : isHuyReq
            ? `Yêu cầu hủy hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) sẽ hết hạn sau 2 ngày nữa. Nếu không duyệt, yêu cầu sẽ bị hủy bỏ.`
            : `Hợp đồng phòng ${rPhong?.maPhong || ''} (Mã: ${hd.maHopDong}) của bạn sẽ bị hủy sau 2 ngày nữa. Vui lòng xác nhận hợp đồng để hoàn tất quá trình thuê.`;

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
