import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SuCo from '@/models/SuCo';
import Phong from '@/models/Phong';
import KhachThue from '@/models/KhachThue';
import ThongBao from '@/models/ThongBao';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';
import { sendGeneralNotificationEmail, isValidEmail } from '@/lib/mail';

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
      const userId = new mongoose.Types.ObjectId(session.user.id);
      
      // Tìm ID khách thuê liên quan
      let linkedIds = [userId];
      const ktAccount = await KhachThue.findOne({
        $or: [
          { _id: userId },
          { soDienThoai: session.user.phone }
        ]
      }).select('_id');
      if (ktAccount && !ktAccount._id.equals(userId)) {
        linkedIds.push(ktAccount._id);
      }

      query.khachThue = { $in: linkedIds };

      // Filter by building if specified
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
        .sort({ ngayTao: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SuCo.countDocuments(query)
    ]);

    const ToaNhaModel = mongoose.models.ToaNha || mongoose.model('ToaNha');
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
    
    const suCoList = await Promise.all(suCoListRaw.map(async (sc: any) => {
      let khachThue = null;
      if (sc.khachThue) {
        khachThue = await KhachThue.findById(sc.khachThue).select('hoTen soDienThoai').lean();
        if (!khachThue) {
          khachThue = await NguoiDung.findOne({ _id: sc.khachThue, role: 'khachThue' }).select('hoTen soDienThoai').lean();
        }
      }
      
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
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    if (session.user.role === 'khachThue') {
      const userId = new mongoose.Types.ObjectId(session.user.id);
      
      let khachThue = await KhachThue.findOne({ 
        $or: [
          { _id: userId },
          { soDienThoai: session.user.phone }
        ]
      }).select('_id');
      
      const ktId = khachThue ? khachThue._id : userId;
      
      const validContracts = await HopDong.find({
        khachThueId: { $in: [userId, ktId] },
        trangThai: { $ne: 'daHuy' }
      }).select('phong');
      
      if (!validContracts || validContracts.length === 0) {
        return NextResponse.json({ message: 'Bạn không có hợp đồng thuê phòng nào' }, { status: 400 });
      }
      
      if (!body.phong) {
        body.phong = validContracts[0].phong.toString();
      } else {
        const validPhongIds = validContracts.map(c => c.phong.toString());
        if (!validPhongIds.includes(body.phong)) {
          return NextResponse.json({ message: 'Phòng được chọn không thuộc hợp đồng của bạn' }, { status: 403 });
        }
      }
      
      body.khachThue = ktId.toString();
    }

    const validatedData = suCoSchema.parse(body);
    await dbConnect();

    const phong = await Phong.findById(validatedData.phong);
    if (!phong) {
      return NextResponse.json({ message: 'Phòng không tồn tại' }, { status: 400 });
    }

    const newSuCo = new SuCo({
      ...validatedData,
      anhSuCo: validatedData.anhSuCo || [],
      mucDoUuTien: validatedData.mucDoUuTien || 'trungBinh',
      trangThai: validatedData.trangThai || 'moi',
    });

    await newSuCo.save();

    // --- Thông báo ---
    try {
      const roomInfo = await Phong.findById(validatedData.phong).populate('toaNha');
      if (roomInfo && roomInfo.toaNha) {
        const toaNhaDetails = roomInfo.toaNha as any;
        const senderId = session.user.id;
        const isSenderKhachThue = session.user.role === 'khachThue';
        
        const landlords = [toaNhaDetails.chuSoHuu, ...(toaNhaDetails.nguoiQuanLy || [])].filter(Boolean);
        const landlordReceiverIds = Array.from(new Set(landlords.map((r: any) => r.toString())))
          .filter(id => id !== senderId)
          .map(id => new mongoose.Types.ObjectId(id));

        if (landlordReceiverIds.length > 0 && isSenderKhachThue) {
          const senderName = session.user.name || 'Khách thuê';
          const maPhong = roomInfo.maPhong || '';
          const tenToaNha = toaNhaDetails.tenToaNha || '';
          const notifTieuDe = `Sự cố mới: ${validatedData.tieuDe}`;
          const notifNoiDung = `Khách thuê ${senderName} (phòng ${maPhong} - ${tenToaNha}) vừa báo cáo sự cố mới: ${validatedData.tieuDe}.\n\nMô tả: ${validatedData.moTa}`;

          await ThongBao.create({
            tieuDe: notifTieuDe,
            noiDung: notifNoiDung,
            loai: 'suCo',
            nguoiGui: new mongoose.Types.ObjectId(senderId),
            nguoiNhan: landlordReceiverIds,
            phong: [roomInfo._id],
            toaNha: toaNhaDetails._id,
            daDoc: [],
          });

          // Email background
          ;(async () => {
             const NguoiDung = (await import('@/models/NguoiDung')).default;
             const landlordUsers = await NguoiDung.find({ _id: { $in: landlordReceiverIds } }).select('email ten name');
             for (const user of landlordUsers) {
               if (user.email && isValidEmail(user.email)) {
                 await sendGeneralNotificationEmail({
                   email: user.email,
                   khachThueName: user.ten || user.name || 'Chủ nhà',
                   tieuDe: notifTieuDe,
                   noiDung: notifNoiDung
                 }).catch(console.error);
               }
             }
          })();
        }

        if (!isSenderKhachThue && validatedData.khachThue) {
          const tenantIdStr = validatedData.khachThue.toString();
          if (tenantIdStr !== senderId) {
            const notifContent = `Quản lý vừa báo cáo sự cố mới cho phòng của bạn: ${validatedData.tieuDe}.\n\nMô tả: ${validatedData.moTa}`;
            await ThongBao.create({
              tieuDe: `Thông báo sự cố: ${validatedData.tieuDe}`,
              noiDung: notifContent,
              loai: 'suCo',
              nguoiGui: new mongoose.Types.ObjectId(senderId),
              nguoiNhan: [new mongoose.Types.ObjectId(tenantIdStr)],
              phong: [roomInfo._id],
              toaNha: toaNhaDetails._id,
              daDoc: [],
            });
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
      return NextResponse.json({ success: false, message: error.issues[0].message }, { status: 400 });
    }
    console.error('Error creating su co:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
