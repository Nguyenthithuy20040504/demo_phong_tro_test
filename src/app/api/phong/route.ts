import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import KhachThue from '@/models/KhachThue';
import { updatePhongStatus } from '@/lib/status-utils';
import { getAccessibleToaNhaIds, isToaNhaAccessible } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';

const phongSchema = z.object({
  maPhong: z.string().min(1, 'Mã phòng là bắt buộc'),
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const toaNha = searchParams.get('toaNha') || '';
    const trangThai = searchParams.get('trangThai') || '';

    const query: any = {};
    
    if (search) {
      query.$or = [
        { maPhong: { $regex: search, $options: 'i' } },
        { moTa: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (toaNha) {
      query.toaNha = toaNha;
    }
    
    // Auth role check
    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    if (accessibleToaNhaIds !== null) {
      if (query.toaNha) {
        // If query has a specific toaNha, ensure user is authorized to see it
        const isAuthorized = accessibleToaNhaIds.some(id => id.toString() === query.toaNha);
        if (!isAuthorized) {
          return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
        }
      } else {
        query.toaNha = { $in: accessibleToaNhaIds };
      }
    }
    
    if (trangThai) {
      query.trangThai = trangThai;
    }

    const phongList = await Phong.find(query)
      .populate('toaNha', 'tenToaNha diaChi')
      .sort({ maPhong: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Cập nhật trạng thái phòng dựa trên hợp đồng
    await Promise.all(
      phongList.map(phong => updatePhongStatus(phong._id.toString()))
    );

    // Lấy lại dữ liệu với trạng thái đã cập nhật và thông tin hợp đồng
    const updatedPhongList = await Phong.find(query)
      .populate('toaNha', 'tenToaNha diaChi')
      .sort({ maPhong: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Thêm thông tin hợp đồng và khách thuê cho mỗi phòng (với hỗ trợ polymorphic tenants)
    const phongListWithContracts = await Promise.all(
      updatedPhongList.map(async (phongDoc) => {
        const phong = phongDoc.toObject();
        const hopDongRaw: any = await HopDong.findOne({
          phong: phong._id,
          trangThai: 'hoatDong',
          $or: [
            {
              ngayBatDau: { $lte: new Date() },
              ngayKetThuc: { $gte: new Date() }
            },
            {
              ngayBatDau: { $gt: new Date() } // Cho phép cả hợp đồng đã đặt nhưng chưa đến ngày
            }
          ]
        }).lean();

        if (hopDongRaw) {
          // Thủ công populate khachThueId và nguoiDaiDien
          const ktIds = hopDongRaw.khachThueId || [];
          const [ktFromKT, ktFromND] = await Promise.all([
            KhachThue.find({ _id: { $in: ktIds } }).select('hoTen soDienThoai').lean(),
            mongoose.model('NguoiDung').find({ _id: { $in: ktIds }, role: 'khachThue' }).select('ten name soDienThoai phone').lean()
          ]);
          
          const allKt: any[] = [
            ...ktFromKT, 
            ...(ktFromND as any[]).map(u => ({ 
              _id: u._id,
              hoTen: u.ten || u.name, 
              soDienThoai: u.soDienThoai || u.phone 
            }))
          ];
          
          let nguoiDaiDien = null;
          if (hopDongRaw.nguoiDaiDien) {
            nguoiDaiDien = await KhachThue.findById(hopDongRaw.nguoiDaiDien).select('hoTen soDienThoai').lean();
            if (!nguoiDaiDien) {
              const u: any = await mongoose.model('NguoiDung').findOne({ _id: hopDongRaw.nguoiDaiDien, role: 'khachThue' }).select('ten name soDienThoai phone').lean();
              if (u && !Array.isArray(u)) {
                nguoiDaiDien = {
                  _id: u._id,
                  hoTen: u.ten || u.name,
                  soDienThoai: u.soDienThoai || u.phone
                };
              }
            }
          }

          return {
            ...phong,
            hopDongHienTai: {
              ...hopDongRaw,
              khachThueId: allKt,
              nguoiDaiDien: nguoiDaiDien
            }
          };
        }

        return {
          ...phong,
          hopDongHienTai: null
        };
      })
    );

    const total = await Phong.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: phongListWithContracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

export async function POST(request: NextRequest) {
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

    // Check if user has access to this building
    const hasAccess = await isToaNhaAccessible(session.user, validatedData.toaNha);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền thêm phòng vào tòa nhà này' },
        { status: 403 }
      );
    }

    // Check if toa nha exists
    const toaNha = await ToaNha.findById(validatedData.toaNha);
    if (!toaNha) {
      return NextResponse.json(
        { message: 'Tòa nhà không tồn tại' },
        { status: 400 }
      );
    }

    // Kiểm tra trùng mã phòng trong cùng tòa nhà
    const filterQuery: any = {
      toaNha: validatedData.toaNha,
      maPhong: { $regex: new RegExp(`^${validatedData.maPhong.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    };

    const existingPhong = await Phong.findOne(filterQuery);
    if (existingPhong) {
      return NextResponse.json(
        { message: `Mã phòng "${validatedData.maPhong}" đã tồn tại trong tòa nhà này. Vui lòng sử dụng số khác!` },
        { status: 400 }
      );
    }

    // Chuẩn hóa tienNghi về camelCase trước khi lưu
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

    const newPhong = new Phong({
      ...validatedData,
      anhPhong: validatedData.anhPhong || [],
      tienNghi: normalizedTienNghi,
      trangThai: 'trong', // Mặc định là trống, sẽ được cập nhật tự động
    });

    await newPhong.save();

    // Cập nhật trạng thái dựa trên hợp đồng
    await updatePhongStatus(newPhong._id.toString());

    return NextResponse.json({
      success: true,
      data: newPhong,
      message: 'Phòng đã được tạo thành công',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating phong:', error);
    
    // Catch MongoDB duplicate key error (if the manual check fails due to race condition)
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json(
        { message: 'Mã phòng này đã tồn tại trong tòa nhà. Vui lòng kiểm tra lại!' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
