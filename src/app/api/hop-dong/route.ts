import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import Phong from '@/models/Phong';
import KhachThue from '@/models/KhachThue';
import ToaNha from '@/models/ToaNha';
import NguoiDung from '@/models/NguoiDung';
import { updatePhongStatus, updateAllKhachThueStatus } from '@/lib/status-utils';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';
import { sendGeneralNotificationEmail, isValidEmail } from '@/lib/mail';

const phiDichVuSchema = z.object({
  ten: z.string().min(1, 'Tên dịch vụ là bắt buộc'),
  gia: z.number().min(0, 'Giá dịch vụ phải lớn hơn hoặc bằng 0'),
});

const hopDongSchema = z.object({
  maHopDong: z.string().min(1, 'Mã hợp đồng là bắt buộc'),
  phong: z.string().min(1, 'Phòng là bắt buộc'),
  khachThueId: z.array(z.string()).optional(),
  nguoiDaiDien: z.string().optional(),
  snapshotKhachThue: z.array(z.object({
    hoTen: z.string(),
    soDienThoai: z.string().optional(),
  })).optional(),
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
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
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
    const trangThai = searchParams.get('trangThai') || '';
    const toaNhaId = searchParams.get('toaNhaId');

    const query: any = {};
    
    if (search) {
      query.$or = [
        { maHopDong: { $regex: search, $options: 'i' } },
        { dieuKhoan: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (trangThai) {
      query.trangThai = trangThai;
    }

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    
    let targetToaNhaIds = accessibleToaNhaIds;
    if (toaNhaId && toaNhaId !== 'all' && mongoose.isValidObjectId(toaNhaId)) {
      const requestedId = new mongoose.Types.ObjectId(toaNhaId);
      if (accessibleToaNhaIds !== null) {
        const isAccessible = accessibleToaNhaIds.some(id => id.toString() === toaNhaId);
        if (isAccessible) {
          targetToaNhaIds = [requestedId];
        } else {
          return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
        }
      } else {
        targetToaNhaIds = [requestedId];
      }
    }

    if (session.user.role === 'khachThue') {
      // Khách thuê chỉ xem hợp đồng của mình: Tìm tất cả các hồ sơ KhachThue liên kết với User này
      const userId = session.user.id;
      const linkedIds = [new mongoose.Types.ObjectId(userId)];
      
      const ktRecords = await KhachThue.find({
        $or: [
          { _id: userId },
          { soDienThoai: session.user.phone },
          { email: session.user.email }
        ]
      }).select('_id');
      
      ktRecords.forEach(kt => {
        if (!linkedIds.some(id => id.toString() === kt._id.toString())) {
          linkedIds.push(kt._id);
        }
      });

      query.$or = [
        { khachThueId: { $in: linkedIds } },
        { nguoiDaiDien: { $in: linkedIds } }
      ];
      
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


    const [hopDongListRaw, total] = await Promise.all([
      HopDong.find(query)
        .populate({
          path: 'phong',
          select: 'maPhong toaNha dienTich giaThue tienCoc giaDien giaNuoc',
        })
        .sort({ ngayTao: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      HopDong.countDocuments(query)
    ]);

    // 1. Thu thập tất cả các ID liên quan để fetch thông tin bổ sung (Party B & Party A)
    const involvedUserIds = new Set<string>();
    const involvedToaNhaIds = new Set<string>();
    
    hopDongListRaw.forEach((hd: any) => {
      // Party B & Tenants info IDs
      if (hd.khachThueId) hd.khachThueId.forEach((id: any) => involvedUserIds.add(id.toString()));
      if (hd.nguoiDaiDien) involvedUserIds.add(hd.nguoiDaiDien.toString());
      
      // Buildings Info (ToaNha)
      const bId = hd.phong?.toaNha?._id || hd.phong?.toaNha;
      if (bId) involvedToaNhaIds.add(bId.toString());
    });

    // Cực kỳ quan trọng: Fetch ToaNha trước, sau đó lấy ID chủ nhà để add vào involvedUserIds
    const allToaNhas = await ToaNha.find({ _id: { $in: Array.from(involvedToaNhaIds) } }).lean();
    allToaNhas.forEach((t: any) => {
      if (t.chuSoHuu) {
        involvedUserIds.add(t.chuSoHuu.toString());
      }
    });

    // 2. Fetch dữ liệu bổ sung song song (Users) để điền thông chi tiết
    const allUsers = await Promise.all([
       KhachThue.find({ _id: { $in: Array.from(involvedUserIds) } }).lean(),
       NguoiDung.find({ _id: { $in: Array.from(involvedUserIds) } }).lean()
    ]).then(([kts, nds]) => [...kts, ...nds]);

    // 3. Tạo map để tra cứu nhanh thông tin User (Party A & B)
    const userLookup = new Map<string, any>();
    allUsers.forEach((u: any) => {
      const id = u._id.toString();
      if (!userLookup.has(id)) {
        userLookup.set(id, { 
          _id: u._id, 
          hoTen: u.hoTen || u.ten || u.name, 
          soDienThoai: u.soDienThoai || u.phone,
          cccd: u.cccd,
          address: u.address || u.queQuan 
        });
      }
    });

    const toaNhaLookup = new Map(allToaNhas.map((t: any) => [t._id.toString(), t]));

    // 4. Lắp ráp dữ liệu cuối cùng chuẩn bị trả về cho Client
    const hopDongList = hopDongListRaw.map((hd: any) => {
      const snapshots = hd.snapshotKhachThue || [];
      
      // -- Gắn thông tin chi tiết cho Party B --
      const ktIds = hd.khachThueId || [];
      const allKt: any[] = [];
      ktIds.forEach((ktId: any) => {
        const idStr = ktId.toString();
        const found = userLookup.get(idStr);
        if (found) allKt.push(found);
        else {
          const snap = snapshots.find((s: any) => s.id === idStr);
          allKt.push({ _id: ktId, hoTen: snap?.hoTen || '(Trống)', soDienThoai: snap?.soDienThoai || '' });
        }
      });
      
      let nguoiDaiDien = null;
      if (hd.nguoiDaiDien) {
        const idStr = hd.nguoiDaiDien.toString();
        nguoiDaiDien = userLookup.get(idStr);
        if (!nguoiDaiDien) {
          const snap = snapshots.find((s: any) => s.id === idStr);
          nguoiDaiDien = { _id: hd.nguoiDaiDien, hoTen: snap?.hoTen || '(Trống)', soDienThoai: snap?.soDienThoai || '' };
        }
      }

      // -- Gắn thông tin chi tiết cho Party A (Tòa nhà & Chủ nhà) --
      if (hd.phong) {
        const bId = hd.phong.toaNha?._id || hd.phong.toaNha;
        if (bId) {
          const fullToaNha = toaNhaLookup.get(bId.toString()) as any;
          if (fullToaNha) {
            // Chuẩn hóa thông tin chủ nhà (Owner) bằng cách lookup trực tiếp từ userLookup
            const ownerId = fullToaNha.chuSoHuu?.toString();
            if (ownerId) {
                const owner = userLookup.get(ownerId);
                if (owner) {
                    fullToaNha.chuSoHuu = {
                      _id: owner._id,
                      hoTen: owner.hoTen,
                      soDienThoai: owner.soDienThoai,
                      cccd: owner.cccd,
                      address: owner.address
                    };
                } else {
                    fullToaNha.chuSoHuu = {};
                }
            }
            hd.phong.toaNha = fullToaNha;
          }
        }
      }

      return { ...hd, khachThueId: allKt, nguoiDaiDien: nguoiDaiDien, snapshotKhachThue: snapshots };
    });

    return NextResponse.json({
      success: true,
      data: hopDongList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching hop dong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = hopDongSchema.parse(body);

    await dbConnect();

    // Check if phong exists
    const phong = await Phong.findById(validatedData.phong);
    if (!phong) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 400 }
      );
    }

    // Validate: phải có ít nhất 1 khách thuê thực sự trong DB
    if (!validatedData.khachThueId || validatedData.khachThueId.length === 0) {
      return NextResponse.json(
        { message: 'Phải có ít nhất 1 khách thuê đã có tài khoản và được liên kết' },
        { status: 400 }
      );
    }

    const ktIds = validatedData.khachThueId;
    const chuNhaId = session.user.id;

    // Use aggregation to check for accounts
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

    const missingAccount = tenantsWithAccounts.find(t => !t.account || t.account.length === 0);
    if (missingAccount) {
      return NextResponse.json(
        { message: `Khách thuê "${missingAccount.hoTen}" chưa có tài khoản hoặc chưa được liên kết. Vui lòng kiểm tra lại trang Quản lý khách thuê.` },
        { status: 400 }
      );
    }

    const existingHopDong = await HopDong.findOne({
      phong: validatedData.phong,
      trangThai: { $in: ['hoatDong', 'choDuyet'] },
      $or: [
        {
          ngayBatDau: { $lte: new Date() },
          ngayKetThuc: { $gte: new Date() }
        },
        {
          ngayBatDau: { $lte: new Date(validatedData.ngayKetThuc) },
          ngayKetThuc: { $gte: new Date(validatedData.ngayBatDau) }
        }
      ]
    });

    if (existingHopDong) {
      return NextResponse.json(
        { message: 'Phòng đã có hợp đồng trong khoảng thời gian này' },
        { status: 400 }
      );
    }

    const snapshotKhachThue: Array<{id?: string, hoTen: string, soDienThoai: string, laNoiDaiDien: boolean}> = [];
    
    for (const t of tenantsWithAccounts) {
      snapshotKhachThue.push({
        id: t._id.toString(),
        hoTen: t.hoTen || 'Không rõ',
        soDienThoai: t.soDienThoai || '',
        laNoiDaiDien: validatedData.nguoiDaiDien ? t._id.toString() === validatedData.nguoiDaiDien : false
      });
    }

    const newHopDong = new HopDong({
      ...validatedData,
      khachThueId: validatedData.khachThueId || [],
      nguoiDaiDien: validatedData.nguoiDaiDien || undefined,
      ngayBatDau: new Date(validatedData.ngayBatDau),
      ngayKetThuc: new Date(validatedData.ngayKetThuc),
      phiDichVu: validatedData.phiDichVu || [],
      snapshotKhachThue: snapshotKhachThue,
      trangThai: 'choDuyet',
    });

    await newHopDong.save();

    try {
      const ThongBao = (await import('@/models/ThongBao')).default;
      const phongInfo = await Phong.findById(validatedData.phong).select('maPhong');
      const tenPhong = phongInfo?.maPhong || 'N/A';
      const khachThueIds = validatedData.khachThueId || [];
      if (khachThueIds.length > 0) {
        const nguoiNhanIds = khachThueIds.map((id: string) => new mongoose.Types.ObjectId(id));
        await ThongBao.create({
          tieuDe: `Hợp đồng mới chờ duyệt - Phòng ${tenPhong}`,
          noiDung: `Hợp đồng thuê phòng ${tenPhong} (Mã: ${validatedData.maHopDong}) đang chờ xác nhận. Nếu bạn là người đại diện, vui lòng xem chi tiết và ký duyệt.`,
          loai: 'hopDong',
          nguoiGui: new mongoose.Types.ObjectId(session.user.id),
          nguoiNhan: nguoiNhanIds,
          phong: [new mongoose.Types.ObjectId(validatedData.phong)],
          ngayGui: new Date(),
        });

        for (const ktId of khachThueIds) {
          try {
            let ktEmail = '';
            let ktName = 'Khách thuê';
            const ktDoc = await KhachThue.findById(ktId).select('hoTen email').lean() as any;
            if (ktDoc) {
              ktEmail = ktDoc.email || '';
              ktName = ktDoc.hoTen || 'Khách thuê';
            } else {
              const ndDoc = await NguoiDung.findById(ktId).select('ten name email').lean() as any;
              if (ndDoc) {
                ktEmail = ndDoc.email || '';
                ktName = ndDoc.ten || ndDoc.name || 'Khách thuê';
              }
            }
            if (ktEmail && isValidEmail(ktEmail)) {
              await sendGeneralNotificationEmail({
                email: ktEmail,
                khachThueName: ktName,
                tieuDe: `Hợp đồng thuê phòng mới chờ duyệt - Phòng ${tenPhong}`,
                noiDung: `Chủ trọ vừa tạo hợp đồng thuê phòng ${tenPhong} (Mã hợp đồng: ${validatedData.maHopDong}) và đang chờ bạn xác nhận.\n\nVui lòng đăng nhập vào hệ thống để xem chi tiết hợp đồng. Nếu bạn là người đại diện, vui lòng ký duyệt để hợp đồng có hiệu lực.`,
                ccEmail: '',
              });
            }
          } catch (emailErr) {
            console.error(`[Email] Lỗi gửi email cho khách thuê ${ktId}:`, emailErr);
          }
        }
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      data: newHopDong,
      message: 'Hợp đồng đã được tạo và gửi cho khách thuê duyệt',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating hop dong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
