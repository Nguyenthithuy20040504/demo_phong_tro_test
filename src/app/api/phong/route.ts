import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import KhachThue from '@/models/KhachThue';
import HoaDon from '@/models/HoaDon';
import SuCo from '@/models/SuCo';
import NguoiDung from '@/models/NguoiDung';
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
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const toaNha = searchParams.get('toaNha') || '';
    const trangThai = searchParams.get('trangThai') || '';

    const query: any = {};
    if (search) query.$or = [{ maPhong: { $regex: search, $options: 'i' } }, { moTa: { $regex: search, $options: 'i' } }];
    if (toaNha) query.toaNha = toaNha;
    
    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    if (accessibleToaNhaIds !== null) {
      if (query.toaNha) {
        if (!accessibleToaNhaIds.some(id => id.toString() === query.toaNha)) {
           return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
        }
      } else {
        query.toaNha = { $in: accessibleToaNhaIds };
      }
    }
    if (trangThai) query.trangThai = trangThai;

    const action = searchParams.get('action');

    const [phongList, total] = await Promise.all([
      Phong.find(query).populate('toaNha').sort({ tang: 1, maPhong: 1 }).skip((page-1)*limit).limit(limit).lean(),
      Phong.countDocuments(query)
    ]);

    if (action === 'basic') {
      return NextResponse.json({ 
        success: true, 
        data: phongList, 
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } 
      });
    }

    // Full mapping for non-basic request
    await Promise.all(phongList.map((phong: any) => updatePhongStatus(phong._id.toString())));
    
    // Query again since status might have changed
    const updatedPhongList = await Phong.find(query).populate('toaNha').sort({ tang: 1, maPhong: 1 }).skip((page-1)*limit).limit(limit);

    const phongListWithContracts = await Promise.all(
      updatedPhongList.map(async (phongDoc) => {
        const phong: any = phongDoc.toObject();
        let hopDongRaw: any = await HopDong.findOne({
          phong: phong._id
        }).sort({ ngayTao: -1 }).lean();

        // Chỉ chấp nhận nếu là hợp đồng đang hoạt động hoặc đang chờ duyệt
        if (hopDongRaw && !['hoatDong', 'choDuyet'].includes(hopDongRaw.trangThai)) {
          hopDongRaw = null;
        }

        // Nếu còn hiệu lực hoặc là tương lai
        if (hopDongRaw) {
          const now = new Date();
          const isCurrentOrFuture = (hopDongRaw.ngayBatDau <= now && hopDongRaw.ngayKetThuc >= now) || (hopDongRaw.ngayBatDau > now);
          if (!isCurrentOrFuture) {
            hopDongRaw = null;
          }
        }

        const [hoaDonMoiNhat, suCoCount] = await Promise.all([
          HoaDon.findOne({ phong: phong._id }).sort({ nam: -1, thang: -1 }).lean(),
          SuCo.countDocuments({ phong: phong._id, trangThai: { $in: ['moi', 'dangXuLy'] } })
        ]);
 
        let trangThaiTongHop: string = 'trong';
        if (phong.trangThai === 'baoTri' || suCoCount > 0) {
          trangThaiTongHop = 'suCo';
        } else if (hopDongRaw && hopDongRaw.trangThai === 'choDuyet') {
          trangThaiTongHop = 'choDuyet';
        } else if (phong.trangThai === 'dangThue' || phong.trangThai === 'daDat') {
          if (hoaDonMoiNhat && ['quaHan', 'chuaThanhToan', 'daThanhToanMotPhan'].includes((hoaDonMoiNhat as any).trangThai)) {
            trangThaiTongHop = 'treTien';
          } else {
            trangThaiTongHop = 'daThanhToan';
          }
        }

        if (hopDongRaw) {
          const ktIds = (hopDongRaw.khachThueId || []) as any[];
          const snapshots = (hopDongRaw.snapshotKhachThue || []) as any[];
          const [ktFromKT, ktFromND] = await Promise.all([
            KhachThue.find({ _id: { $in: ktIds } }).select('hoTen soDienThoai').lean(),
            NguoiDung.find({ _id: { $in: ktIds }, role: 'khachThue' }).select('ten name soDienThoai phone').lean()
          ]);
          const userMap = new Map();
          ktFromKT.forEach((kt: any) => userMap.set(kt._id.toString(), kt));
          ktFromND.forEach((nd: any) => userMap.set(nd._id.toString(), { hoTen: nd.ten || nd.name, soDienThoai: nd.soDienThoai || nd.phone }));
          const allKt = ktIds.map((id: any) => {
            const idStr = id.toString();
            const found = userMap.get(idStr);
            if (found) return found;
            const snap = snapshots.find((s: any) => s.id === idStr);
            return { hoTen: snap?.hoTen || '(Không có thông tin)', soDienThoai: snap?.soDienThoai || '' };
          });
          snapshots.forEach((snap: any) => { if (!snap.id && snap.hoTen && !allKt.some((k: any) => k.hoTen === snap.hoTen)) allKt.push({ hoTen: snap.hoTen, soDienThoai: snap.soDienThoai || '' }); });
          let nguoiDaiDien = hopDongRaw.nguoiDaiDien ? (userMap.get(hopDongRaw.nguoiDaiDien.toString()) || allKt[0]) : allKt[0];

          return { ...phong, hopDongHienTai: { ...hopDongRaw, khachThueId: allKt, nguoiDaiDien }, hoaDonMoiNhat, suCoMoi: suCoCount, trangThaiTongHop };
        }
        return { ...phong, hopDongHienTai: null, hoaDonMoiNhat, suCoMoi: suCoCount, trangThaiTongHop };
      })
    );
    return NextResponse.json({ success: true, data: phongListWithContracts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error fetching phong:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const validatedData = phongSchema.parse(body);
    await dbConnect();
    const hasAccess = await isToaNhaAccessible(session.user, validatedData.toaNha);
    if (!hasAccess) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const newPhong = new Phong({ ...validatedData, anhPhong: validatedData.anhPhong || [], trangThai: 'trong' });
    await newPhong.save();
    await updatePhongStatus(newPhong._id.toString());
    return NextResponse.json({ success: true, data: newPhong }, { status: 201 });
  } catch (error) {
    console.error('Error creating phong:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
