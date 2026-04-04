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

    console.log(`[GET /api/hop-dong] Params - toaNhaId: ${toaNhaId}, search: ${search}, trangThai: ${trangThai}`);

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    
    // Filter by specific building if requested
    let targetToaNhaIds = accessibleToaNhaIds;
    if (toaNhaId && toaNhaId !== 'all' && mongoose.isValidObjectId(toaNhaId)) {
      const requestedId = new mongoose.Types.ObjectId(toaNhaId);
      if (accessibleToaNhaIds !== null) {
        // If user has restricted access, check if requested toaNhaId is in their list
        const isAccessible = accessibleToaNhaIds.some(id => id.toString() === toaNhaId);
        if (isAccessible) {
          targetToaNhaIds = [requestedId];
        } else {
          // Requested building not accessible
          console.warn(`[GET /api/hop-dong] Requested building ${toaNhaId} is not accessible for user ${session.user.id}`);
          return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
        }
      } else {
        // Super admin or unrestricted access
        targetToaNhaIds = [requestedId];
      }
    }

    console.log(`[GET /api/hop-dong] Final Target ToaNha IDs:`, targetToaNhaIds === null ? 'All' : targetToaNhaIds.map(id => id.toString()));
    
    if (session.user.role === 'khachThue') {
      // Khách thuê chỉ xem hợp đồng của mình
      const userId = session.user.id;
      let ktRecord = await KhachThue.findOne({
        $or: [
          { _id: userId },
          { soDienThoai: session.user.phone }
        ]
      }).select('_id');
      const ktId = ktRecord ? ktRecord._id : new mongoose.Types.ObjectId(userId);
      query.khachThueId = { $in: [new mongoose.Types.ObjectId(userId), ktId] };
      
      // If toaNhaId is provided for tenant, we should also filter by it
      if (targetToaNhaIds !== null && targetToaNhaIds.length > 0) {
        const phongsInBuilding = await Phong.find({ toaNha: { $in: targetToaNhaIds } }).select('_id');
        query.phong = { $in: phongsInBuilding.map(p => p._id) };
      }
    } else if (targetToaNhaIds !== null) {
      if (targetToaNhaIds.length === 0) {
         console.warn(`[GET /api/hop-dong] User has no accessible buildings.`);
         return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      const accessiblePhongs = await Phong.find({ toaNha: { $in: targetToaNhaIds } }).select('_id');
      const phongIds = accessiblePhongs.map(p => p._id);
      console.log(`[GET /api/hop-dong] Filtered query by ${phongIds.length} phongs in targeted buildings`);
      
      if (phongIds.length === 0) {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      query.phong = { $in: phongIds };
    } else {
      console.log(`[GET /api/hop-dong] Unrestricted query (no building filter applied)`);
    }


    const [hopDongListRaw, total] = await Promise.all([
      HopDong.find(query)
        .populate({
          path: 'phong',
          select: 'maPhong toaNha',
          populate: {
            path: 'toaNha',
            select: 'tenToaNha'
          }
        })
        .sort({ ngayTao: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      HopDong.countDocuments(query)
    ]);
    console.log(`[GET /api/hop-dong] Raw HopDongs count:`, total);

    // Optimize: Bulk fetch all tenants and users to avoid N+1 queries
    const allInvolvedIds = new Set<string>();
    hopDongListRaw.forEach(hd => {
      if (hd.khachThueId) hd.khachThueId.forEach((id: any) => allInvolvedIds.add(id.toString()));
      if (hd.nguoiDaiDien) allInvolvedIds.add(hd.nguoiDaiDien.toString());
    });

    const uniqueIds = Array.from(allInvolvedIds);
    const [allKhachThues, allNguoiDungs] = await Promise.all([
      KhachThue.find({ _id: { $in: uniqueIds } }).select('hoTen soDienThoai').lean(),
      NguoiDung.find({ _id: { $in: uniqueIds } }).select('ten name soDienThoai phone').lean()
    ]);

    const userMap = new Map<string, any>();
    allKhachThues.forEach((kt: any) => userMap.set(kt._id.toString(), kt));
    allNguoiDungs.forEach((nd: any) => {
      const id = nd._id.toString();
      if (!userMap.has(id)) {
        userMap.set(id, { 
          _id: nd._id, 
          hoTen: nd.ten || nd.name, 
          soDienThoai: nd.soDienThoai || nd.phone 
        });
      }
    });

    const hopDongList = hopDongListRaw.map((hd) => {
      const ktIds = hd.khachThueId || [];
      const snapshots = (hd as any).snapshotKhachThue || [];
      const allKt: any[] = [];
      
      // 1) Populate from khachThueId
      ktIds.forEach((ktId: any) => {
        const idStr = ktId.toString();
        const found = userMap.get(idStr);
        if (found) {
          allKt.push(found);
        } else {
          // Fallback: snapshot
          const snap = snapshots.find((s: any) => s.id === idStr);
          allKt.push({ _id: ktId, hoTen: snap?.hoTen || '(Không có thông tin)', soDienThoai: snap?.soDienThoai || '' });
        }
      });
      
      // 2) Append snapshot-only tenants (không có ID trong DB)
      for (const snap of snapshots) {
        if (!snap.id && snap.hoTen) {
          // Khách thuê chỉ có tên/SĐT, chưa có tài khoản
          const alreadyExists = allKt.some(k => k.hoTen === snap.hoTen);
          if (!alreadyExists) {
            allKt.push({ hoTen: snap.hoTen, soDienThoai: snap.soDienThoai || '' });
          }
        }
      }
      
      let nguoiDaiDien = null;
      if (hd.nguoiDaiDien) {
        const idStr = hd.nguoiDaiDien.toString();
        nguoiDaiDien = userMap.get(idStr);
        if (!nguoiDaiDien) {
          const snap = snapshots.find((s: any) => s.id === idStr);
          nguoiDaiDien = { _id: hd.nguoiDaiDien, hoTen: snap?.hoTen || '(Không có thông tin)', soDienThoai: snap?.soDienThoai || '' };
        }
      }
      
      // Nếu không có nguoiDaiDien từ DB, tìm từ snapshot
      if (!nguoiDaiDien) {
        const daiDienSnap = snapshots.find((s: any) => s.laNoiDaiDien);
        if (daiDienSnap) {
          nguoiDaiDien = { hoTen: daiDienSnap.hoTen, soDienThoai: daiDienSnap.soDienThoai || '' };
        } else if (allKt.length > 0) {
          nguoiDaiDien = allKt[0]; // Fallback: người đầu tiên
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
    
    if (!session) {
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

    // Validate: phải có ít nhất 1 khách thuê (qua khachThueId hoặc snapshotKhachThue)
    const hasDbTenants = validatedData.khachThueId && validatedData.khachThueId.length > 0;
    const hasFrontendSnapshot = validatedData.snapshotKhachThue && validatedData.snapshotKhachThue.length > 0;
    
    if (!hasDbTenants && !hasFrontendSnapshot) {
      return NextResponse.json(
        { message: 'Phải có ít nhất 1 khách thuê' },
        { status: 400 }
      );
    }

    // Check if khach thue exist (chỉ khi có khachThueId)
    if (hasDbTenants) {
      const [khachThueFromKT, khachThueFromND] = await Promise.all([
        KhachThue.find({ _id: { $in: validatedData.khachThueId } }).select('_id'),
        mongoose.model('NguoiDung').find({ _id: { $in: validatedData.khachThueId }, role: 'khachThue' }).select('_id')
      ]);
      const totalFound = new Set([
        ...khachThueFromKT.map((k: any) => k._id.toString()),
        ...khachThueFromND.map((u: any) => u._id.toString())
      ]);
      if (totalFound.size !== validatedData.khachThueId!.length) {
        return NextResponse.json(
          { message: 'Một hoặc nhiều khách thuê không tồn tại' },
          { status: 400 }
        );
      }
    }

    // Kiểm tra phòng có hợp đồng đang hoạt động hoặc chờ duyệt không
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

    // Build snapshot khách thuê
    const snapshotKhachThue: Array<{id?: string, hoTen: string, soDienThoai: string, laNoiDaiDien: boolean}> = [];
    
    // 1) Từ khachThueId (nếu có) - khách thuê đã có tài khoản
    if (hasDbTenants) {
      for (const ktId of validatedData.khachThueId!) {
        let hoTen = '';
        let soDienThoai = '';
        const ktDoc = await KhachThue.findById(ktId).select('hoTen soDienThoai').lean() as any;
        if (ktDoc) {
          hoTen = ktDoc.hoTen || '';
          soDienThoai = ktDoc.soDienThoai || '';
        } else {
          const ndDoc = await mongoose.model('NguoiDung').findById(ktId).select('ten name soDienThoai phone').lean() as any;
          if (ndDoc) {
            hoTen = ndDoc.ten || ndDoc.name || '';
            soDienThoai = ndDoc.soDienThoai || ndDoc.phone || '';
          }
        }
        snapshotKhachThue.push({
          id: ktId,
          hoTen: hoTen || 'Không rõ',
          soDienThoai: soDienThoai,
          laNoiDaiDien: validatedData.nguoiDaiDien ? ktId === validatedData.nguoiDaiDien : false
        });
      }
    }
    
    // 2) Từ frontend snapshot (khách thuê chưa có tài khoản - chỉ có tên + SĐT)
    if (hasFrontendSnapshot) {
      for (const kt of validatedData.snapshotKhachThue!) {
        // Kiểm tra xem đã được thêm từ khachThueId chưa (tránh trùng)
        const alreadyAdded = snapshotKhachThue.some(
          s => s.hoTen === kt.hoTen || (kt.soDienThoai && s.soDienThoai === kt.soDienThoai)
        );
        if (!alreadyAdded) {
          snapshotKhachThue.push({
            hoTen: kt.hoTen,
            soDienThoai: kt.soDienThoai || '',
            laNoiDaiDien: false
          });
        }
      }
    }

    const newHopDong = new HopDong({
      ...validatedData,
      khachThueId: validatedData.khachThueId || [],
      nguoiDaiDien: validatedData.nguoiDaiDien || undefined,
      ngayBatDau: new Date(validatedData.ngayBatDau),
      ngayKetThuc: new Date(validatedData.ngayKetThuc),
      phiDichVu: validatedData.phiDichVu || [],
      snapshotKhachThue: snapshotKhachThue,
      trangThai: 'choDuyet', // Chờ khách thuê duyệt
    });

    await newHopDong.save();

    // KHÔNG cập nhật trạng thái phòng/khách thuê ở đây
    // Chỉ cập nhật khi khách thuê duyệt hợp đồng

    // Gửi thông báo cho khách thuê
    try {
      const ThongBao = (await import('@/models/ThongBao')).default;
      
      // Lấy thông tin phòng để hiển thị trong thông báo
      const phongInfo = await Phong.findById(validatedData.phong).select('maPhong');
      const tenPhong = phongInfo?.maPhong || 'N/A';

      // Gửi thông báo cho TẤT CẢ khách thuê trong hợp đồng
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
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Không fail request nếu gửi thông báo lỗi
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
