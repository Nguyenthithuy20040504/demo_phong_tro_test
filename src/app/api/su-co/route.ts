import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SuCo from '@/models/SuCo';
import Phong from '@/models/Phong';
import KhachThue from '@/models/KhachThue';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';

const suCoSchema = z.object({
  phong: z.string().min(1, 'Phòng là bắt buộc'),
  khachThue: z.string().nullable().optional(),
  tieuDe: z.string().min(1, 'Tiêu đề là bắt buộc'),
  moTa: z.string().min(1, 'Mô tả là bắt buộc'),
  anhSuCo: z.array(z.string()).optional(),
  loaiSuCo: z.enum(['dienNuoc', 'noiThat', 'vesinh', 'anNinh', 'khac']),
  mucDoUuTien: z.enum(['thap', 'trungBinh', 'cao', 'khancap']).optional(),
  trangThai: z.enum(['moi', 'dangXuLy', 'daXong', 'daHuy']).optional(),
});

// Đảm bảo model NguoiDung được load
import '@/models/NguoiDung';

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
    const loaiSuCo = searchParams.get('loaiSuCo') || '';
    const mucDoUuTien = searchParams.get('mucDoUuTien') || '';
    const trangThai = searchParams.get('trangThai') || '';

    const query: any = {};
    
    if (search) {
      query.$or = [
        { tieuDe: { $regex: search, $options: 'i' } },
        { moTa: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (loaiSuCo) {
      query.loaiSuCo = loaiSuCo;
    }
    
    if (mucDoUuTien) {
      query.mucDoUuTien = mucDoUuTien;
    }
    
    if (trangThai) {
      query.trangThai = trangThai;
    }

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    
    if (session.user.role === 'khachThue') {
      const userId = session.user.id;
      const linkedIds = [new mongoose.Types.ObjectId(userId)];
      
      const kt = await KhachThue.findOne({ 
        $or: [
          { _id: userId },
          { soDienThoai: session.user.phone }
        ]
      }).select('_id');
      
      if (kt && kt._id.toString() !== userId) {
        linkedIds.push(kt._id);
      }
      
      query.khachThue = { $in: linkedIds };
    } else if (accessibleToaNhaIds !== null) {
      if (accessibleToaNhaIds.length === 0) {
         return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      const accessiblePhongs = await Phong.find({ toaNha: { $in: accessibleToaNhaIds } }).select('_id');
      const phongIds = accessiblePhongs.map(p => p._id);
      
      if (phongIds.length === 0) {
         return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      
      query.phong = { $in: phongIds };
    }

    const suCoListRaw = await SuCo.find(query)
      .populate({
        path: 'phong',
        select: 'maPhong toaNha',
        populate: {
          path: 'toaNha',
          select: 'tenToaNha'
        }
      })
      .populate('nguoiXuLy', 'ten email')
      .sort({ ngayBaoCao: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Thủ công populate khachThue từ cả 2 collection và toaNha
    const ToaNhaModel = mongoose.models.ToaNha || mongoose.model('ToaNha');
    const suCoList = await Promise.all(suCoListRaw.map(async (sc: any) => {
      let khachThue = null;
      if (sc.khachThue) {
        khachThue = await KhachThue.findById(sc.khachThue).select('hoTen soDienThoai').lean();
        if (!khachThue) {
          khachThue = await mongoose.model('NguoiDung').findOne({ _id: sc.khachThue, role: 'khachThue' }).select('hoTen soDienThoai').lean();
        }
      }
      
      // Xử lý an toàn cho Tòa nhà (trường hợp populate lồng nhau bị lỗi)
      if (sc.phong && sc.phong.toaNha && typeof sc.phong.toaNha !== 'object') {
        const toaNhaInfo = await ToaNhaModel.findById(sc.phong.toaNha).select('tenToaNha').lean();
        if (toaNhaInfo) {
          sc.phong.toaNha = toaNhaInfo;
        }
      }
      
      return { ...sc, khachThue };
    }));

    const total = await SuCo.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: suCoList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching su co:', error);
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
    
    // Nếu là khách thuê, tự gán khachThue, nhưng cho phép chọn phòng từ hợp đồng đang hoạt động
    if (session.user.role === 'khachThue') {
      const userId = session.user.id;
      
      // Tìm khách thuê
      let khachThue = await KhachThue.findOne({ 
        $or: [
          { _id: userId },
          { soDienThoai: session.user.phone }
        ]
      }).select('_id');
      
      const ktId = khachThue ? khachThue._id : new mongoose.Types.ObjectId(userId);
      
      // Tìm tất cả hợp đồng hoạt động để xác thực phòng được chọn
      const HopDong = (await import('@/models/HopDong')).default;
      const activeContracts = await HopDong.find({
        khachThueId: { $in: [new mongoose.Types.ObjectId(userId), ktId] },
        trangThai: 'hoatDong'
      }).select('phong');
      
      if (!activeContracts || activeContracts.length === 0) {
        return NextResponse.json(
          { message: 'Bạn không có hợp đồng thuê phòng nào đang hoạt động' },
          { status: 400 }
        );
      }
      
      // Nếu client không gửi phòng, tự động lấy phòng đầu tiên
      if (!body.phong) {
        body.phong = activeContracts[0].phong.toString();
      } else {
        // Kiểm tra phòng client gửi phải thuộc hợp đồng của họ
        const validPhongIds = activeContracts.map(c => c.phong.toString());
        if (!validPhongIds.includes(body.phong)) {
          return NextResponse.json(
            { message: 'Phòng được chọn không thuộc hợp đồng của bạn' },
            { status: 403 }
          );
        }
      }
      
      body.khachThue = ktId.toString();
    }

    const validatedData = suCoSchema.parse(body);

    await dbConnect();

    // Check if phong exists
    const phong = await Phong.findById(validatedData.phong);
    if (!phong) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 400 }
      );
    }

    // Check if khach thue exists (only if provided)
    if (validatedData.khachThue) {
      const khachThueKT = await KhachThue.findById(validatedData.khachThue);
      const khachThueND = !khachThueKT ? await mongoose.model('NguoiDung').findOne({ _id: validatedData.khachThue, role: 'khachThue' }) : null;
      
      if (!khachThueKT && !khachThueND) {
        return NextResponse.json(
          { message: 'Khách thuê không tồn tại' },
          { status: 400 }
        );
      }
    }

    const newSuCo = new SuCo({
      ...validatedData,
      anhSuCo: validatedData.anhSuCo || [],
      mucDoUuTien: validatedData.mucDoUuTien || 'trungBinh',
      trangThai: validatedData.trangThai || 'moi',
    });

    await newSuCo.save();

    return NextResponse.json({
      success: true,
      data: newSuCo,
      message: 'Sự cố đã được báo cáo thành công',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating su co:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
