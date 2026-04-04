import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import KhachThue from '@/models/KhachThue';
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

    // Kiểm tra người duyệt phải là NGƯỜI ĐẠI DIỆN (không phải bất kỳ khách thuê nào)
    // Xây dựng danh sách linkedIds giống /me route để xử lý trường hợp
    // ID đăng nhập từ NguoiDung khác với ID KhachThue trong hợp đồng
    const userId = session.user.id;
    const linkedIds: string[] = [userId];

    // Tìm KhachThue record liên kết với user đang đăng nhập
    let khachThueRecord = await KhachThue.findById(userId);
    if (!khachThueRecord && (session.user as any).phone) {
      khachThueRecord = await KhachThue.findOne({ soDienThoai: (session.user as any).phone });
    }
    if (!khachThueRecord && session.user.email) {
      khachThueRecord = await KhachThue.findOne({ email: session.user.email });
    }
    if (khachThueRecord && khachThueRecord._id.toString() !== userId) {
      linkedIds.push(khachThueRecord._id.toString());
    }

    // Chỉ cho phép NGƯỜI ĐẠI DIỆN duyệt (không phải tất cả khách thuê)
    const nguoiDaiDienId = hopDong.nguoiDaiDien?.toString();
    const isNguoiDaiDien = nguoiDaiDienId && linkedIds.includes(nguoiDaiDienId);

    // Cho phép cả người đại diện và chủ nhà thao tác
    const isOwner = session.user.role === 'chuNha' || session.user.role === 'admin';

    if (!isNguoiDaiDien && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'Chỉ người đại diện hợp đồng mới có quyền phê duyệt' },
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

      // Import HoaDon if not already
      const HoaDon = (await import('@/models/HoaDon')).default;

      // Sinh hóa đơn tiền cọc tự động
      let checkoutUrl = '';
      if (chuNhaId && hopDong.tienCoc > 0) {
        const dbUser = await mongoose.model('NguoiDung').findById(chuNhaId).select('thongTinThanhToan');
        if (dbUser && dbUser.thongTinThanhToan && dbUser.thongTinThanhToan.soTaiKhoan) {
          const { nganHang, soTaiKhoan, chuTaiKhoan } = dbUser.thongTinThanhToan;
          // Fix URL spaces and ensure clean query params
          const bankId = encodeURIComponent(nganHang.trim().replace(/\s+/g, ''));
          const accNo = encodeURIComponent(soTaiKhoan.trim());
          const addInfo = encodeURIComponent(`Thu tien coc HD ${hopDong.maHopDong}`);
          let accName = '';
          if (chuTaiKhoan) accName = `&accountName=${encodeURIComponent(chuTaiKhoan.trim())}`;
          
          checkoutUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?amount=${hopDong.tienCoc}&addInfo=${addInfo}${accName}`;
        }

        const now = new Date();
        const hoaDonCoc = await HoaDon.create({
          maHoaDon: 'COC-' + hopDong.maHopDong,
          hopDong: hopDong._id,
          phong: hopDong.phong._id || hopDong.phong,
          khachThue: hopDong.nguoiDaiDien,
          thang: now.getMonth() + 1,
          nam: now.getFullYear(),
          tienPhong: 0,
          tienDien: 0,
          soDien: 0,
          chiSoDienBanDau: hopDong.chiSoDienBanDau,
          chiSoDienCuoiKy: hopDong.chiSoDienBanDau,
          tienNuoc: 0,
          soNuoc: 0,
          chiSoNuocBanDau: hopDong.chiSoNuocBanDau,
          chiSoNuocCuoiKy: hopDong.chiSoNuocBanDau,
          phiDichVu: [],
          tongTien: hopDong.tienCoc,
          daThanhToan: 0,
          conLai: hopDong.tienCoc,
          trangThai: 'chuaThanhToan',
          hanThanhToan: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days to pay deposit
          ghiChu: `Hóa đơn thu tiền ĐẶT CỌC ban đầu cho hợp đồng ${hopDong.maHopDong}`,
          checkoutUrl: checkoutUrl
        });

        // Gửi thông báo có Hóa đơn Cọc
        try {
          await ThongBao.create({
            tieuDe: `[Quan Trọng] Đóng phí Đặt cọc Hợp đồng - Phòng ${tenPhong}`,
            noiDung: `Hệ thống vừa phát hành Hóa đơn tiền cọc trị giá ${hopDong.tienCoc.toLocaleString('vi-VN')}đ. Bạn vui lòng quét mã VietQR và thanh toán nhé!`,
            loai: 'hoaDon',
            nguoiGui: new mongoose.Types.ObjectId(chuNhaId.toString()), // Chủ nhà gửi
            nguoiNhan: [new mongoose.Types.ObjectId(userId)], // Gửi về cho bạn người duyệt
            phong: [hopDong.phong._id || hopDong.phong],
            ngayGui: new Date(),
          });
        } catch(e) {}
      }

      // Gửi thông báo cho chủ nhà (Hợp đồng đã duyệt)
      if (chuNhaId) {
        try {
          await ThongBao.create({
            tieuDe: `Hợp đồng đã được duyệt - Phòng ${tenPhong}`,
            noiDung: `Khách thuê đã đồng ý và duyệt hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}). ${hopDong.tienCoc > 0 ? 'Hóa đơn tiền Đặt cọc đã được phát hành tự động tới khách.' : ''}`,
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
