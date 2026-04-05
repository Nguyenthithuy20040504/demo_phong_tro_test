import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SuCo from '@/models/SuCo';
import Phong from '@/models/Phong';
import KhachThue from '@/models/KhachThue';
import ThongBao from '@/models/ThongBao';
import ToaNha from '@/models/ToaNha';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';

const suCoSchema = z.object({
  phong: z.string().min(1, 'Phòng là bắt buộc'),
  khachThue: z.string().nullable().optional(),
  tieuDe: z.string().min(1, 'Tiêu đề là bắt buộc'),
  moTa: z.string().min(1, 'Mô tả là bắt buộc').max(5000, 'Mô tả không được quá 5000 ký tự'),
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
    const toaNhaId = searchParams.get('toaNhaId');

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
    let targetToaNhaIds = accessibleToaNhaIds;

    if (toaNhaId && toaNhaId !== 'all') {
      if (accessibleToaNhaIds === null) {
        // Admin
        targetToaNhaIds = [new mongoose.Types.ObjectId(toaNhaId)];
      } else {
        // Check access
        const isAccessible = accessibleToaNhaIds.some(id => id.toString() === toaNhaId);
        targetToaNhaIds = isAccessible ? [new mongoose.Types.ObjectId(toaNhaId)] : [];
      }
    }
    
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

      // Filter by building if tenant specify it
      if (targetToaNhaIds !== null && targetToaNhaIds.length > 0) {
        const phongsInBuilding = await Phong.find({ toaNha: { $in: targetToaNhaIds } }).select('_id');
        query.phong = { $in: phongsInBuilding.map(p => p._id) };
      }
    } else if (targetToaNhaIds !== null) {
      if (targetToaNhaIds.length === 0) {
         return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      const accessiblePhongs = await Phong.find({ toaNha: { $in: targetToaNhaIds } }).select('_id');
      const phongIds = accessiblePhongs.map(p => p._id);
      
      if (phongIds.length === 0) {
         return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      
      query.phong = { $in: phongIds };
    }

    const [suCoListRaw, total] = await Promise.all([
      SuCo.find(query)
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
        .lean(),
      SuCo.countDocuments(query)
    ]);

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
      
      // Tìm tất cả hợp đồng chưa bị hủy để xác thực phòng được chọn
      const HopDong = (await import('@/models/HopDong')).default;
      const validContracts = await HopDong.find({
        khachThueId: { $in: [new mongoose.Types.ObjectId(userId), ktId] },
        trangThai: { $ne: 'daHuy' }
      }).select('phong');
      
      if (!validContracts || validContracts.length === 0) {
        return NextResponse.json(
          { message: 'Bạn không có hợp đồng thuê phòng nào' },
          { status: 400 }
        );
      }
      
      // Nếu client không gửi phòng, tự động lấy phòng đầu tiên
      if (!body.phong) {
        body.phong = validContracts[0].phong.toString();
      } else {
        // Kiểm tra phòng client gửi phải thuộc hợp đồng của họ
        const validPhongIds = validContracts.map(c => c.phong.toString());
        if (!validPhongIds.includes(body.phong)) {
          return NextResponse.json(
             { message: 'Phòng được chọn không thuộc hợp đồng của bạn hoặc hợp đồng đã bị hủy' },
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

    // --- Gửi thông báo cho các bên liên quan (Chủ nhà/Quản lý & Khách thuê) ---
    try {
      const roomInfo = await Phong.findById(validatedData.phong).populate('toaNha');
      if (roomInfo && roomInfo.toaNha) {
        const toaNhaDetails = roomInfo.toaNha as any;
        const senderId = session.user.id;
        const isSenderKhachThue = session.user.role === 'khachThue';
        
        // 1) Thông báo cho Chủ nhà & Quản lý (nếu người gửi là khách thuê hoặc quản lý khác)
        const landlords = [
          toaNhaDetails.chuSoHuu,
          ...(toaNhaDetails.nguoiQuanLy || [])
        ].filter(Boolean);

        const landlordReceiverIds = Array.from(new Set(
          landlords.map(r => r.toString())
        )).filter(id => id !== senderId)
          .map(id => new mongoose.Types.ObjectId(id));

        if (landlordReceiverIds.length > 0 && isSenderKhachThue) {
          const senderName = session.user.name || 'Khách thuê';
          const maPhong = roomInfo.maPhong || '';
          const tenToaNha = toaNhaDetails.tenToaNha || '';

          await ThongBao.create({
            tieuDe: `🚀 Sự cố mới: ${validatedData.tieuDe}`,
            noiDung: `Khách thuê ${senderName} (phòng ${maPhong} - ${tenToaNha}) vừa báo cáo sự cố mới: ${validatedData.tieuDe}.\n\nMô tả: ${validatedData.moTa}`,
            loai: 'suCo',
            nguoiGui: new mongoose.Types.ObjectId(senderId),
            nguoiNhan: landlordReceiverIds,
            toaNha: toaNhaDetails._id,
            daDoc: [],
          });
        }

        // 2) Thông báo cho Khách thuê (nếu người gửi là Quản lý/Chủ nhà)
        if (!isSenderKhachThue && validatedData.khachThue) {
          const tenantIdStr = validatedData.khachThue.toString();
          if (tenantIdStr !== senderId) {
            await ThongBao.create({
              tieuDe: `🚩 Thông báo sự cố: ${validatedData.tieuDe}`,
              noiDung: `Quản lý vừa báo cáo sự cố mới cho phòng của bạn: ${validatedData.tieuDe}.\n\nTrạng thái: ${validatedData.trangThai === 'dangXuLy' ? 'Đang được xử lý' : 'Chờ xử lý'}.\nMô tả: ${validatedData.moTa}`,
              loai: 'suCo',
              nguoiGui: new mongoose.Types.ObjectId(senderId),
              nguoiNhan: [new mongoose.Types.ObjectId(tenantIdStr)],
              toaNha: toaNhaDetails._id,
              daDoc: [],
            });
            console.log(`[SuCo Notification] Đã gửi thông báo cho khách thuê ${tenantIdStr}`);
          }
        }
      }
    } catch (notifError) {
      console.error('Error creating su co notification:', notifError);
    }

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
