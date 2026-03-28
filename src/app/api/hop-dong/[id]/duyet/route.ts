import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import ThongBao from '@/models/ThongBao';
import { updatePhongStatus, updateAllKhachThueStatus } from '@/lib/status-utils';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'duyet' | 'tuChoi'

    if (!['duyet', 'tuChoi'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Action phải là "duyet" hoặc "tuChoi"' },
        { status: 400 }
      );
    }

    await dbConnect();

    const hopDong = await HopDong.findById(params.id)
      .populate({
        path: 'phong',
        select: 'maPhong toaNha',
        populate: {
          path: 'toaNha',
          select: 'tenToaNha chuSoHuu'
        }
      });

    if (!hopDong) {
      return NextResponse.json(
        { success: false, message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra hợp đồng đang ở trạng thái chờ duyệt
    if (hopDong.trangThai !== 'choDuyet') {
      return NextResponse.json(
        { success: false, message: 'Hợp đồng không ở trạng thái chờ duyệt' },
        { status: 400 }
      );
    }

    // Kiểm tra người duyệt phải là khách thuê trong hợp đồng
    const userId = session.user.id;
    const isKhachThue = hopDong.khachThueId.some(
      (id: any) => id.toString() === userId
    );

    // Cho phép cả khách thuê và chủ nhà thao tác
    const isOwner = session.user.role === 'chuTro' || session.user.role === 'admin';

    if (!isKhachThue && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền thao tác hợp đồng này' },
        { status: 403 }
      );
    }

    const phongInfo = hopDong.phong as any;
    const tenPhong = phongInfo?.maPhong || 'N/A';
    
    // Lấy chủ nhà từ tòa nhà
    const chuNhaId = phongInfo?.toaNha?.chuSoHuu;

    if (action === 'duyet') {
      // Duyệt hợp đồng
      hopDong.trangThai = 'hoatDong';
      await hopDong.save();

      // Cập nhật trạng thái phòng và khách thuê
      await updatePhongStatus(hopDong.phong._id || hopDong.phong);
      const khachThueIds = hopDong.khachThueId.map((id: any) => id.toString());
      await updateAllKhachThueStatus(khachThueIds);

      // Gửi thông báo cho chủ nhà
      if (chuNhaId) {
        try {
          await ThongBao.create({
            tieuDe: `Hợp đồng đã được duyệt - Phòng ${tenPhong}`,
            noiDung: `Khách thuê đã đồng ý và duyệt hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}). Hợp đồng hiện đã có hiệu lực.`,
            loai: 'hopDong',
            nguoiGui: new mongoose.Types.ObjectId(userId),
            nguoiNhan: [chuNhaId],
            phong: [hopDong.phong._id || hopDong.phong],
            ngayGui: new Date(),
          });
        } catch (e) {
          console.error('Error sending approval notification:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Hợp đồng đã được duyệt và có hiệu lực',
        data: { trangThai: 'hoatDong' }
      });

    } else {
      // Từ chối hợp đồng
      hopDong.trangThai = 'daHuy';
      await hopDong.save();

      // Gửi thông báo cho chủ nhà
      if (chuNhaId) {
        try {
          await ThongBao.create({
            tieuDe: `Hợp đồng bị từ chối - Phòng ${tenPhong}`,
            noiDung: `Khách thuê đã từ chối hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}).`,
            loai: 'hopDong',
            nguoiGui: new mongoose.Types.ObjectId(userId),
            nguoiNhan: [chuNhaId],
            phong: [hopDong.phong._id || hopDong.phong],
            ngayGui: new Date(),
          });
        } catch (e) {
          console.error('Error sending rejection notification:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Hợp đồng đã bị từ chối',
        data: { trangThai: 'daHuy' }
      });
    }

  } catch (error) {
    console.error('Error processing contract approval:', error);
    return NextResponse.json(
      { success: false, message: 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
