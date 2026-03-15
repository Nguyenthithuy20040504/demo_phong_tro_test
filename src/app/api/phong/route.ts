import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import KhachThue from '@/models/KhachThue';
import { updatePhongStatus } from '@/lib/status-utils';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';

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
            mongoose.model('NguoiDung').find({ _id: { $in: ktIds }, role: 'khachThue' }).select('hoTen soDienThoai').lean()
          ]);
          const allKt: any[] = [...ktFromKT, ...ktFromND.map((u: any) => ({ ...u, hoTen: u.hoTen }))];
          
          let nguoiDaiDien = null;
          if (hopDongRaw.nguoiDaiDien) {
            nguoiDaiDien = await KhachThue.findById(hopDongRaw.nguoiDaiDien).select('hoTen soDienThoai').lean();
            if (!nguoiDaiDien) {
              nguoiDaiDien = await mongoose.model('NguoiDung').findOne({ _id: hopDongRaw.nguoiDaiDien, role: 'khachThue' }).select('hoTen soDienThoai').lean();
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

    // Check if toa nha exists
    const toaNha = await ToaNha.findById(validatedData.toaNha);
    if (!toaNha) {
      return NextResponse.json(
        { message: 'Tòa nhà không tồn tại' },
        { status: 400 }
      );
    }

    // Check if room number already exists in this building
    const existingPhong = await Phong.findOne({ 
      toaNha: validatedData.toaNha, 
      maPhong: validatedData.maPhong.trim().toUpperCase() 
    });
    if (existingPhong) {
      return NextResponse.json(
        { message: 'Số phòng này đã tồn tại trong tòa nhà' },
        { status: 400 }
      );
    }

    const newPhong = new Phong({
      ...validatedData,
      anhPhong: validatedData.anhPhong || [],
      tienNghi: validatedData.tienNghi || [],
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
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
