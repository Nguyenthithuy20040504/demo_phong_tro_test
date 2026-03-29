import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import { isToaNhaAccessible, getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { updatePhongStatus } from '@/lib/status-utils';
import { z } from 'zod';

const phongSchema = z.object({
  maPhong: z.string().min(1, 'Số phòng là bắt buộc'),
  toaNha: z.string().min(1, 'Tòa nhà là bắt buộc'),
  tang: z.number().min(0, 'Tầng phải lớn hơn hoặc bằng 0'),
  dienTich: z.number().min(1, 'Diện tích phải lớn hơn 0'),
  giaThue: z.number().min(0, 'Giá thuê phải lớn hơn hoặc bằng 0'),
  tienCoc: z.number().min(0, 'Tiền cọc phải lớn hơn hoặc bằng 0'),
  moTa: z.string().optional(),
  anhPhong: z.array(z.string()).optional(),
  tienNghi: z.array(z.string()).optional(),
  soNguoiToiDa: z.number().min(1, 'Số người tối đa phải lớn hơn 0').max(10, 'Số người tối đa không được quá 10'),
});

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

    const phong = await Phong.findById(id)
      .populate('toaNha', 'tenToaNha diaChi chuSoHuu');

    if (!phong) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập thông qua tòa nhà
    const hasAccess = await isToaNhaAccessible(session.user, (phong.toaNha as any)._id || phong.toaNha);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập thông tin phòng này' },
        { status: 403 }
      );
    }

    // Cập nhật trạng thái phòng trước khi trả về
    await updatePhongStatus(id);

    const phongObj = phong.toObject();
    const mongoose = (await import('mongoose')).default;

    // 1. Lấy thông tin chủ trọ từ tòa nhà
    let chuTro = null;
    const toaNhaData = phongObj.toaNha as any;
    if (toaNhaData?.chuSoHuu) {
      const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
      const chuNha = await NguoiDungModel.findById(toaNhaData.chuSoHuu)
        .select('ten name hoTen email soDienThoai phone avatar')
        .lean() as any;
      if (chuNha) {
        chuTro = {
          _id: chuNha._id,
          hoTen: chuNha.ten || chuNha.name || chuNha.hoTen || 'Chủ trọ',
          email: chuNha.email || '',
          soDienThoai: chuNha.soDienThoai || chuNha.phone || '',
          avatar: chuNha.avatar || ''
        };
      }
    }

    // 2. Lấy thông tin khách thuê đang ở (từ hợp đồng hoạt động)
    const HopDongModel = mongoose.models.HopDong || mongoose.model('HopDong');
    const KhachThueModel = mongoose.models.KhachThue || mongoose.model('KhachThue');
    const NguoiDungModel2 = mongoose.models.NguoiDung || mongoose.model('NguoiDung');

    const hopDongHoatDong = await HopDongModel.findOne({
      phong: id,
      trangThai: 'hoatDong',
      ngayBatDau: { $lte: new Date() },
      ngayKetThuc: { $gte: new Date() }
    }).select('khachThueId nguoiDaiDien snapshotKhachThue ngayBatDau ngayKetThuc maHopDong').lean() as any;

    let khachThueHienTai: any[] = [];
    if (hopDongHoatDong) {
      const ktIds = hopDongHoatDong.khachThueId || [];
      const snapshots = hopDongHoatDong.snapshotKhachThue || [];

      for (const ktId of ktIds) {
        let ktDoc = await KhachThueModel.findById(ktId).select('hoTen soDienThoai email avatar').lean() as any;
        if (ktDoc) {
          khachThueHienTai.push({
            _id: ktDoc._id,
            hoTen: ktDoc.hoTen,
            soDienThoai: ktDoc.soDienThoai || '',
            email: ktDoc.email || '',
            avatar: ktDoc.avatar || '',
            laNguoiDaiDien: ktId.toString() === hopDongHoatDong.nguoiDaiDien?.toString()
          });
          continue;
        }
        const ndDoc = await NguoiDungModel2.findById(ktId).select('ten name soDienThoai phone email avatar').lean() as any;
        if (ndDoc) {
          khachThueHienTai.push({
            _id: ndDoc._id,
            hoTen: ndDoc.ten || ndDoc.name || '',
            soDienThoai: ndDoc.soDienThoai || ndDoc.phone || '',
            email: ndDoc.email || '',
            avatar: ndDoc.avatar || '',
            laNguoiDaiDien: ktId.toString() === hopDongHoatDong.nguoiDaiDien?.toString()
          });
          continue;
        }
        // Fallback từ snapshot
        const snap = snapshots.find((s: any) => s.id === ktId.toString());
        khachThueHienTai.push({
          _id: ktId,
          hoTen: snap?.hoTen || '(Không rõ)',
          soDienThoai: snap?.soDienThoai || '',
          email: '',
          avatar: '',
          laNguoiDaiDien: ktId.toString() === hopDongHoatDong.nguoiDaiDien?.toString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...phongObj,
        chuTro,
        khachThueHienTai,
        hopDongHienTai: hopDongHoatDong ? {
          _id: hopDongHoatDong._id,
          maHopDong: hopDongHoatDong.maHopDong,
          ngayBatDau: hopDongHoatDong.ngayBatDau,
          ngayKetThuc: hopDongHoatDong.ngayKetThuc
        } : null
      },
    });

  } catch (error) {
    console.error('Error fetching phong:', error);
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
    const validatedData = phongSchema.parse(body);

    await dbConnect();
    const { id } = await params;

    // Check if room exists
    const existingRoom = await Phong.findById(id);
    if (!existingRoom) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền chỉnh sửa thông qua tòa nhà HIỆN TẠI của phòng
    const hasAccessToCurrent = await isToaNhaAccessible(session.user, existingRoom.toaNha);
    if (!hasAccessToCurrent) {
      return NextResponse.json(
        { message: 'Bạn không có quyền chỉnh sửa phòng của tòa nhà này' },
        { status: 403 }
      );
    }

    // Nếu thay đổi tòa nhà, kiểm tra xem có quyền ở tòa nhà MỚI không
    if (validatedData.toaNha && validatedData.toaNha.toString() !== existingRoom.toaNha.toString()) {
      const hasAccessToNew = await isToaNhaAccessible(session.user, validatedData.toaNha);
      if (!hasAccessToNew) {
        return NextResponse.json(
          { message: 'Bạn không có quyền chuyển phòng sang tòa nhà này' },
          { status: 403 }
        );
      }
    }

    // Check if toa nha exists
    const toaNha = await ToaNha.findById(validatedData.toaNha);
    if (!toaNha) {
      return NextResponse.json(
        { message: 'Tòa nhà không tồn tại' },
        { status: 400 }
      );
    }

    // Kiểm tra trùng mã phòng trong cùng tòa nhà (loại trừ phòng hiện tại)
    const filterQuery: any = {
      _id: { $ne: id },
      toaNha: validatedData.toaNha,
      maPhong: { $regex: new RegExp(`^${validatedData.maPhong.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    };

    const duplicatePhong = await Phong.findOne(filterQuery);
    if (duplicatePhong) {
      return NextResponse.json(
        { message: `Số phòng "${validatedData.maPhong}" đã tồn tại trong tòa nhà này. Vui lòng sử dụng số khác!` },
        { status: 400 }
      );
    }

    // Chuẩn hóa tienNghi về camelCase trước khi cập nhật
    const tienNghiMap: Record<string, string> = {
      'Điều hòa': 'dieuHoa',
      'Nóng lạnh': 'nongLanh',
      'Tủ lạnh': 'tuLanh',
      'Giường': 'giuong',
      'Tủ quần áo': 'tuQuanAo',
      'Bàn ghế': 'banGhe',
      'WiFi': 'wifi',
      'Máy giặt': 'mayGiat',
      'Bếp': 'bep'
    };

    const normalizedTienNghi = (validatedData.tienNghi || []).map(item => tienNghiMap[item] || item);

    const phong = await Phong.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        anhPhong: validatedData.anhPhong || [],
        tienNghi: normalizedTienNghi,
        // Trạng thái sẽ được cập nhật tự động dựa trên hợp đồng
      },
      { new: true, runValidators: true }
    ).populate('toaNha', 'tenToaNha diaChi');

    // Cập nhật trạng thái dựa trên hợp đồng sau khi cập nhật phòng
    await updatePhongStatus(id);

    // Lấy lại dữ liệu với trạng thái đã cập nhật
    const updatedPhong = await Phong.findById(id)
      .populate('toaNha', 'tenToaNha diaChi');

    return NextResponse.json({
      success: true,
      data: updatedPhong,
      message: 'Phòng đã được cập nhật thành công',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating phong:', error);

    // Catch MongoDB duplicate key error (if the manual check fails due to race condition)
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { message: 'Số phòng này đã tồn tại trong tòa nhà. Vui lòng kiểm tra lại!' },
        { status: 400 }
      );
    }

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

    const phong = await Phong.findById(id);
    if (!phong) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền xóa thông qua tòa nhà
    const hasAccess = await isToaNhaAccessible(session.user, phong.toaNha);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa phòng của tòa nhà này' },
        { status: 403 }
      );
    }

    await Phong.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Phòng đã được xóa thành công',
    });

  } catch (error) {
    console.error('Error deleting phong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
