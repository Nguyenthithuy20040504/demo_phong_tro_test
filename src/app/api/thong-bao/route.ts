import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import { z } from 'zod';
import { sendGeneralNotificationEmail, isValidEmail } from '@/lib/mail';

const thongBaoSchema = z.object({
  tieuDe: z.string().min(1, 'Tiêu đề là bắt buộc'),
  noiDung: z.string().min(1, 'Nội dung là bắt buộc'),
  loai: z.enum(['chung', 'hoaDon', 'suCo', 'hopDong', 'he_thong', 'thanh_toan_saas', 'khac']).optional(),
  nguoiNhan: z.array(z.string()).optional(),
  phong: z.array(z.string()).optional(),
  toaNha: z.string().optional(),
  guiTatCa: z.boolean().optional(),
  vaiTroNhan: z.enum(['chuNha', 'khachThue', 'admin', 'all']).optional(),
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
    
    // Nếu có ?id=, trả về trực tiếp thông báo theo ID
    const notifId = searchParams.get('id');
    if (notifId) {
      const thongBao = await ThongBao.findById(notifId)
        .populate('nguoiGui', 'ten email role vaiTro')
        .populate('phong', 'maPhong')
        .populate('toaNha', 'tenToaNha')
        .lean();
      return NextResponse.json({ success: true, data: thongBao ? [thongBao] : [] });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const loai = searchParams.get('loai') || '';
    const toaNhaId = searchParams.get('toaNhaId');

    const query: any = {};

    if (toaNhaId && toaNhaId !== 'all') {
      query.toaNha = toaNhaId;
    }

    // Phân quyền: ai thấy thông báo nào
    const userRole = session.user.role;
    const userId = session.user.id;

    if (userRole === 'khachThue') {
      // Khách thuê chỉ thấy thông báo gửi cho mình
      query.nguoiNhan = userId;
    } else if (userRole === 'admin') {
      // Admin chỉ thấy: thông báo mình gửi + gửi cho admin + broadcast cho admin
      const mongoose = (await import('mongoose')).default;
      const userObjId = new mongoose.Types.ObjectId(userId);
      query.$or = [
        { nguoiGui: userObjId },
        { nguoiNhan: userObjId },
        { guiTatCa: true, vaiTroNhan: { $in: ['admin', 'all'] } },
      ];
    } else if (userRole === 'chuTro' || userRole === 'chuNha') {
      // Chủ trọ thấy: thông báo mình gửi + gửi cho mình + broadcast cho chủ nhà
      const mongoose = (await import('mongoose')).default;
      const userObjId = new mongoose.Types.ObjectId(userId);
      query.$or = [
        { nguoiGui: userObjId },
        { nguoiNhan: userObjId },
        { guiTatCa: true, vaiTroNhan: { $in: ['chuNha', 'all'] } }
      ];
    }
    
    if (search) {
      // Nếu đã có $or từ phân quyền, cần dùng $and
      const searchCondition = {
        $or: [
          { tieuDe: { $regex: search, $options: 'i' } },
          { noiDung: { $regex: search, $options: 'i' } },
        ]
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, searchCondition];
        delete query.$or;
      } else {
        query.$or = searchCondition.$or;
      }
    }
    
    if (loai) {
      query.loai = loai;
    }

    const [thongBaoList, total] = await Promise.all([
      ThongBao.find(query)
        .populate('nguoiGui', 'ten email role vaiTro')
        .populate('phong', 'maPhong')
        .populate('toaNha', 'tenToaNha')
        .sort({ ngayGui: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ThongBao.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: thongBaoList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching thong bao:', error);
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
    const validatedData = thongBaoSchema.parse(body);

    await dbConnect();

    // Chuẩn bị dữ liệu lưu, loại bỏ các giá trị không hợp lệ cho ObjectId
    const thongBaoData: any = {
      ...validatedData,
      nguoiGui: session.user.id,
      loai: validatedData.loai || 'chung',
      phong: validatedData.phong || [],
      nguoiNhan: validatedData.nguoiNhan || [],
      daDoc: [],
    };

    if (!thongBaoData.guiTatCa && (!thongBaoData.nguoiNhan || thongBaoData.nguoiNhan.length === 0)) {
       return NextResponse.json({ message: 'Phải có ít nhất 1 người nhận hoặc chọn gửi tất cả' }, { status: 400 });
    }

    if (validatedData.toaNha === 'all' || !validatedData.toaNha) {
      delete thongBaoData.toaNha;
    }

    const newThongBao = new ThongBao(thongBaoData);
    await newThongBao.save();

    // --- Gửi email bất đồng bộ (fire-and-forget, không block response) ---
    (async () => {
      try {
        const NguoiDung = (await import('@/models/NguoiDung')).default;
        const KhachThue = (await import('@/models/KhachThue')).default;

        let recipientIds: string[] = thongBaoData.nguoiNhan || [];

        // Nếu guiTatCa, lấy danh sách user theo vaiTroNhan
        if (thongBaoData.guiTatCa && thongBaoData.vaiTroNhan) {
          let roleFilter: string[] = [];
          if (thongBaoData.vaiTroNhan === 'all') roleFilter = ['chuNha', 'khachThue', 'admin', 'nhanVien'];
          else if (thongBaoData.vaiTroNhan === 'chuNha') roleFilter = ['chuNha', 'nhanVien'];
          else if (thongBaoData.vaiTroNhan === 'khachThue') roleFilter = ['khachThue'];
          else if (thongBaoData.vaiTroNhan === 'admin') roleFilter = ['admin'];

          const users = await NguoiDung.find({ role: { $in: roleFilter } }).select('_id').lean();
          recipientIds = users.map((u: any) => u._id.toString());
        }

        if (recipientIds.length === 0 && !thongBaoData.guiTatCa) return;

        // Lấy email từ 2 bảng (NguoiDung + legacy KhachThue)
        const [staffUsers, tenantUsers] = await Promise.all([
          recipientIds.length > 0
            ? NguoiDung.find({ _id: { $in: recipientIds } }).select('ten name email').lean()
            : Promise.resolve([]),
          // guiTatCa cho khachThue: lấy tất cả KhachThue có email
          (thongBaoData.guiTatCa && ['khachThue', 'all'].includes(thongBaoData.vaiTroNhan))
            ? KhachThue.find({}).select('hoTen email').lean()
            : (recipientIds.length > 0
                ? KhachThue.find({ _id: { $in: recipientIds } }).select('hoTen email').lean()
                : Promise.resolve([])),
        ]);

        const emailMap = new Map<string, string>();
        (staffUsers as any[]).forEach((u) => {
          if (u.email && isValidEmail(u.email)) emailMap.set(u.email.toLowerCase(), u.ten || u.name || 'Người dùng');
        });
        (tenantUsers as any[]).forEach((u) => {
          if (u.email && isValidEmail(u.email)) emailMap.set(u.email.toLowerCase(), u.hoTen || 'Khách thuê');
        });

        for (const [email, name] of emailMap.entries()) {
          await sendGeneralNotificationEmail({
            email,
            khachThueName: name,
            tieuDe: thongBaoData.tieuDe,
            noiDung: thongBaoData.noiDung,
            // Không truyền qrUrl → không hiện QR cho thông báo thường
          }).catch((err: any) => console.error('[ThongBao Email] Lỗi gửi email tới', email, err?.message));
        }

        console.log(`[ThongBao Email] Đã gửi email thông báo "${thongBaoData.tieuDe}" cho ${emailMap.size} người nhận`);
      } catch (emailErr: any) {
        console.error('[ThongBao Email] Lỗi không mong đợi khi gửi email:', emailErr?.message);
      }
    })();

    return NextResponse.json({
      success: true,
      data: newThongBao,
      message: 'Thông báo đã được gửi thành công',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating thong bao:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Thông báo đã gửi không được phép chỉnh sửa
export async function PUT() {
  return NextResponse.json(
    { success: false, message: 'Thông báo đã gửi không được phép chỉnh sửa.' },
    { status: 403 }
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'ID thông báo là bắt buộc' },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingThongBao = await ThongBao.findById(id);
    if (!existingThongBao) {
      return NextResponse.json(
        { message: 'Không tìm thấy thông báo' },
        { status: 404 }
      );
    }

    // Chỉ người gửi hoặc admin mới được xóa
    if (existingThongBao.nguoiGui.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa thông báo này' },
        { status: 403 }
      );
    }

    await ThongBao.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Xóa thông báo thành công',
    });

  } catch (error) {
    console.error('Error deleting thong bao:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}