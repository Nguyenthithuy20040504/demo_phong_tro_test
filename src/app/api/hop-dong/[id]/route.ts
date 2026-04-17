import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import Phong from '@/models/Phong';
import KhachThue from '@/models/KhachThue';
import HoaDon from '@/models/HoaDon';
import { updatePhongStatus, updateAllKhachThueStatus } from '@/lib/status-utils';
import { isToaNhaAccessible } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';

const phiDichVuSchema = z.object({
  ten: z.string().min(1, 'Tên dịch vụ là bắt buộc'),
  gia: z.number().min(0, 'Giá dịch vụ phải lớn hơn hoặc bằng 0'),
});

const hopDongSchema = z.object({
  maHopDong: z.string().min(1, 'Mã hợp đồng là bắt buộc'),
  phong: z.string().min(1, 'Phòng là bắt buộc'),
  khachThueId: z.array(z.string()).min(1, 'Phải có ít nhất 1 khách thuê'),
  nguoiDaiDien: z.string().min(1, 'Người đại diện là bắt buộc'),
  ngayBatDau: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
  ngayKetThuc: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
  giaThue: z.number().min(0, 'Giá thuê phải lớn hơn hoặc bằng 0'),
  tienCoc: z.number().min(0, 'Tiền cọc phải lớn hơn hoặc bằng 0'),
  chuKyThanhToan: z.enum(['thang', 'quy', 'nam']),
  ngayThanhToan: z.number().min(1).max(31, 'Ngày thanh toán phải từ 1-31'),
  dieuKhoan: z.string().min(1, 'Điều khoản là bắt buộc'),
  giaDien: z.number().min(0, 'Giá điện phải lớn hơn hoặc bằng 0'),
  giaNuoc: z.number().min(0, 'Giá nước phải lớn hơn hoặc bằng 0'),
  chiSoDienBanDau: z.number().min(0, 'Chỉ số điện ban đầu phải lớn hơn hoặc bằng 0'),
  chiSoNuocBanDau: z.number().min(0, 'Chỉ số nước ban đầu phải lớn hơn hoặc bằng 0'),
  phiDichVu: z.array(phiDichVuSchema).optional(),
  fileHopDong: z.string().optional(),
  trangThai: z.enum(['hoatDong', 'hetHan', 'daHuy']).optional(),
  hoanCoc: z.boolean().optional(),
});

// Schema cho partial update (chỉ cập nhật một số trường)
const hopDongPartialSchema = hopDongSchema.partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;

    const hopDongRaw = await HopDong.findById(id)
      .populate('phong', 'maPhong toaNha')
      .lean() as any;

    if (!hopDongRaw) {
      return NextResponse.json(
        { message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập thông qua tòa nhà của phòng
    const toaNhaId = hopDongRaw.phong?.toaNha || hopDongRaw.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập hợp đồng này' },
        { status: 403 }
      );
    }

    // Populate khachThueId - tìm từng người, fallback sang snapshot
    const ktIds = hopDongRaw.khachThueId || [];
    const snapshots = hopDongRaw.snapshotKhachThue || [];
    const allKt: any[] = [];
    for (const ktId of ktIds) {
      let found = await KhachThue.findById(ktId).select('hoTen soDienThoai').lean();
      if (found) { allKt.push(found); continue; }
      const ndUser = await mongoose.model('NguoiDung').findById(ktId).select('ten name soDienThoai phone').lean() as any;
      if (ndUser) {
        allKt.push({ _id: ndUser._id, hoTen: ndUser.ten || ndUser.name, soDienThoai: ndUser.soDienThoai || ndUser.phone });
        continue;
      }
      // Fallback: snapshot
      const snap = snapshots.find((s: any) => s.id === ktId.toString());
      allKt.push({ _id: ktId, hoTen: snap?.hoTen || '(Không có thông tin)', soDienThoai: snap?.soDienThoai || '' });
    }

    // Populate nguoiDaiDien
    let nguoiDaiDien = null;
    if (hopDongRaw.nguoiDaiDien) {
      nguoiDaiDien = await KhachThue.findById(hopDongRaw.nguoiDaiDien).select('hoTen soDienThoai').lean();
      if (!nguoiDaiDien) {
        const u = await mongoose.model('NguoiDung').findById(hopDongRaw.nguoiDaiDien).select('ten name soDienThoai phone').lean() as any;
        if (u) {
          nguoiDaiDien = { _id: u._id, hoTen: u.ten || u.name, soDienThoai: u.soDienThoai || u.phone };
        } else {
          const snap = snapshots.find((s: any) => s.id === hopDongRaw.nguoiDaiDien.toString());
          nguoiDaiDien = { _id: hopDongRaw.nguoiDaiDien, hoTen: snap?.hoTen || '(Không có thông tin)', soDienThoai: snap?.soDienThoai || '' };
        }
      }
    }

    const hopDong = {
      ...hopDongRaw,
      khachThueId: allKt,
      nguoiDaiDien: nguoiDaiDien
    };

    return NextResponse.json({
      success: true,
      data: hopDong,
    });

  } catch (error) {
    console.error('Error fetching hop dong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = hopDongPartialSchema.parse(body);

    await dbConnect();
    const { id } = await params;

    // Lấy hợp đồng hiện tại để kiểm tra
    const existingHopDong = await HopDong.findById(id).populate('phong');
    if (!existingHopDong) {
      return NextResponse.json(
        { message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Cho phép hủy hợp đồng chờ duyệt (chủ trọ thu hồi)
    if (existingHopDong.trangThai === 'choDuyet') {
      const allowedFields = Object.keys(validatedData);
      const isHuy = allowedFields.length === 1 && allowedFields[0] === 'trangThai' && validatedData.trangThai === 'daHuy';
      // Cho phép chỉnh sửa toàn bộ hoặc hủy khi đang chờ duyệt
      // (không cần restrict vì HĐ chưa được duyệt)
    }

    // Không cho phép chỉnh sửa nội dung hợp đồng đã được duyệt (hoạt động)
    // Ngoại trừ: Gia hạn (cập nhật ngayKetThuc) và Hủy hợp đồng (chuyển trangThai sang daHuy)
    if (existingHopDong.trangThai === 'hoatDong') {
      const allowedFields = Object.keys(validatedData);
      const isGiaHan = allowedFields.length === 1 && allowedFields[0] === 'ngayKetThuc';
      const isHuy = allowedFields.length === 1 && allowedFields[0] === 'trangThai' && validatedData.trangThai === 'daHuy';
      
      if (!isGiaHan && !isHuy) {
        return NextResponse.json(
          { message: 'Không thể chỉnh sửa hợp đồng đã được phê duyệt. Chỉ cho phép gia hạn hoặc hủy hợp đồng.' },
          { status: 403 }
        );
      }
    }

    // Không cho phép chỉnh sửa hợp đồng đã hết hạn (trừ gia hạn) hoặc đã hủy
    if (existingHopDong.trangThai === 'hetHan') {
      const allowedFields = Object.keys(validatedData);
      const isGiaHan = allowedFields.length === 1 && allowedFields[0] === 'ngayKetThuc';
      if (!isGiaHan) {
        return NextResponse.json(
          { message: 'Không thể chỉnh sửa hợp đồng đã hết hạn. Chỉ cho phép gia hạn.' },
          { status: 403 }
        );
      }
    }
    if (existingHopDong.trangThai === 'daHuy') {
      return NextResponse.json(
        { message: 'Không thể chỉnh sửa hợp đồng đã bị hủy.' },
        { status: 403 }
      );
    }

    // Kiểm tra quyền chỉnh sửa tòa nhà hiện tại
    const currentToaNhaId = (existingHopDong.phong as any).toaNha || existingHopDong.phong;
    const hasAccess = await isToaNhaAccessible(session.user, currentToaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền chỉnh sửa hợp đồng của tòa nhà này' },
        { status: 403 }
      );
    }

    // Nếu có cập nhật phòng, kiểm tra phòng tồn tại và quyền ở tòa nhà phòng mới
    if (validatedData.phong) {
      const phong = await Phong.findById(validatedData.phong);
      if (!phong) {
        return NextResponse.json(
          { message: 'Phòng không tồn tại' },
          { status: 400 }
        );
      }
      
      const hasAccessToNew = await isToaNhaAccessible(session.user, phong.toaNha);
      if (!hasAccessToNew) {
        return NextResponse.json(
          { message: 'Bạn không có quyền chuyển hợp đồng sang tòa nhà này' },
          { status: 403 }
        );
      }
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = { ...validatedData };

    // Nếu có cập nhật khách thuê, kiểm tra khách thuê tồn tại và có tài khoản
    if (validatedData.khachThueId) {
      const ktIds = validatedData.khachThueId;
      
      const tenantsWithAccounts = await KhachThue.aggregate([
        { $match: { _id: { $in: ktIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        {
          $lookup: {
            from: 'nguoidungs',
            let: { tenantId: '$_id', phone: '$soDienThoai', email: { $toLower: '$email' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$_id', '$$tenantId'] },
                      { $eq: ['$soDienThoai', '$$phone'] },
                      {
                        $and: [
                          { $ne: ['$$email', null] },
                          { $eq: [{ $toLower: '$email' }, '$$email'] }
                        ]
                      }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: 'account'
          }
        }
      ]);

      if (tenantsWithAccounts.length !== ktIds.length) {
        return NextResponse.json(
          { message: 'Một hoặc nhiều khách thuê không tồn tại' },
          { status: 400 }
        );
      }

      // Ensure ALL selected tenants have an account
      const missingAccount = tenantsWithAccounts.find(t => !t.account || t.account.length === 0);
      if (missingAccount) {
        return NextResponse.json(
          { message: `Khách thuê "${missingAccount.hoTen}" chưa có tài khoản hoặc chưa được liên kết. Vui lòng kiểm tra lại trang Quản lý khách thuê.` },
          { status: 400 }
        );
      }

      // Update snapshotKhachThue to maintain data consistency
      const snapshotKhachThue = tenantsWithAccounts.map(t => ({
        id: t._id.toString(),
        hoTen: t.hoTen || 'Không rõ',
        soDienThoai: t.soDienThoai || '',
        laNoiDaiDien: validatedData.nguoiDaiDien ? t._id.toString() === validatedData.nguoiDaiDien : (existingHopDong.nguoiDaiDien?.toString() === t._id.toString())
      }));
      updateData.snapshotKhachThue = snapshotKhachThue;
    }

    // Nếu có cập nhật người đại diện, kiểm tra người đại diện có trong danh sách khách thuê không
    if (validatedData.nguoiDaiDien && (validatedData.khachThueId || existingHopDong.khachThueId)) {
      const currentKtIds = validatedData.khachThueId || existingHopDong.khachThueId.map((id: any) => id.toString());
      if (!currentKtIds.includes(validatedData.nguoiDaiDien)) {
        return NextResponse.json(
          { message: 'Người đại diện phải là một trong các khách thuê' },
          { status: 400 }
        );
      }
    }

    // Xử lý ngày tháng
    if (validatedData.ngayBatDau) {
      updateData.ngayBatDau = new Date(validatedData.ngayBatDau);
    }
    if (validatedData.ngayKetThuc) {
      const newEndDate = new Date(validatedData.ngayKetThuc);
      updateData.ngayKetThuc = newEndDate;
      
      // Tự động chuyển trạng thái về hoatDong nếu gia hạn
      if (!validatedData.trangThai && newEndDate > new Date()) {
        updateData.trangThai = 'hoatDong';
      }
    }

    const hopDong = await HopDong.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('phong', 'maPhong toaNha')
     .populate('khachThueId', 'hoTen soDienThoai')
     .populate('nguoiDaiDien', 'hoTen soDienThoai');

    if (!hopDong) {
      return NextResponse.json(
        { message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Cập nhật trạng thái phòng và khách thuê tự động
    await updatePhongStatus(hopDong.phong._id.toString());
    if (validatedData.khachThueId) {
      await updateAllKhachThueStatus(validatedData.khachThueId);
    } else {
      await updateAllKhachThueStatus(existingHopDong.khachThueId.map((id: any) => id.toString()));
    }

    // Gửi thông báo hủy hợp đồng cho khách thuê (HĐ11)
    if (validatedData.trangThai === 'daHuy') {
      try {
        const ThongBao = (await import('@/models/ThongBao')).default;
        const phongInfo = await Phong.findById(hopDong.phong._id).select('maPhong');
        const tenPhong = phongInfo?.maPhong || 'N/A';

        // Gửi cho tất cả khách thuê trong hợp đồng
        const nguoiNhanIds = existingHopDong.khachThueId
          .map((ktId: any) => new mongoose.Types.ObjectId(ktId.toString()));

        if (nguoiNhanIds.length > 0) {
          await ThongBao.create({
            tieuDe: `Hợp đồng đã bị hủy - Phòng ${tenPhong}`,
            noiDung: `Hợp đồng thuê phòng ${tenPhong} (Mã: ${existingHopDong.maHopDong}) đã bị chủ trọ hủy. Vui lòng liên hệ chủ trọ để biết thêm chi tiết về tiền cọc và các nghĩa vụ còn lại.`,
            loai: 'hopDong',
            nguoiGui: new mongoose.Types.ObjectId(session.user.id),
            nguoiNhan: nguoiNhanIds,
            phong: [hopDong.phong._id],
            toaNha: hopDong.phong.toaNha,
            ngayGui: new Date(),
          });
        }

        // Xử lý Hoàn tiền cọc (Tạo hóa đơn hoàn tiền)
        if ((validatedData as any).hoanCoc && existingHopDong.tienCoc > 0) {
          const now = new Date();
          const maHoaDonHC = `HC-${hopDong.maHopDong}-${now.getTime().toString().slice(-4)}`;
          
          await HoaDon.create({
            maHoaDon: maHoaDonHC,
            hopDong: hopDong._id,
            phong: hopDong.phong._id,
            khachThue: existingHopDong.nguoiDaiDien || existingHopDong.khachThueId[0],
            thang: now.getMonth() + 1,
            nam: now.getFullYear(),
            tienPhong: 0,
            tienDien: 0,
            soDien: 0,
            chiSoDienBanDau: 0,
            chiSoDienCuoiKy: 0,
            tienNuoc: 0,
            soNuoc: 0,
            chiSoNuocBanDau: 0,
            chiSoNuocCuoiKy: 0,
            phiDichVu: [],
            tongTien: existingHopDong.tienCoc,
            daThanhToan: 0,
            conLai: existingHopDong.tienCoc,
            loai: 'chi', // Loại hoàn trả
            trangThai: 'chuaThanhToan',
            hanThanhToan: now,
            ghiChu: `Hoàn trả tiền cọc do hủy hợp đồng ${existingHopDong.maHopDong}.`,
            isAutoGenerated: true
          });
        }
      } catch (notifError) {
        console.error('Error processing cancellation additions:', notifError);
        // Không fail request nếu gửi thông báo hoặc tạo HĐ lỗi
      }
    }

    return NextResponse.json({
      success: true,
      data: hopDong,
      message: validatedData.trangThai === 'daHuy' 
        ? 'Hợp đồng đã được hủy thành công' 
        : 'Hợp đồng đã được cập nhật thành công',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating hop dong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;

    const hopDong = await HopDong.findById(id).populate('phong');
    if (!hopDong) {
      return NextResponse.json(
        { message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền xóa
    const toaNhaId = (hopDong.phong as any).toaNha || hopDong.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa hợp đồng của tòa nhà này' },
        { status: 403 }
      );
    }

    // Lưu thông tin phòng và khách thuê trước khi xóa
    const phongId = hopDong.phong._id.toString();
    const khachThueIds = hopDong.khachThueId.map((id: any) => id.toString());

    await HopDong.findByIdAndDelete(id);

    // Cập nhật trạng thái phòng và khách thuê sau khi xóa hợp đồng
    await updatePhongStatus(phongId);
    await updateAllKhachThueStatus(khachThueIds);

    return NextResponse.json({
      success: true,
      message: 'Hợp đồng đã được xóa thành công',
    });

  } catch (error) {
    console.error('Error deleting hop dong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
