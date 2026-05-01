import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import HoaDon from '@/models/HoaDon';
import SuCo from '@/models/SuCo';
import HopDong from '@/models/HopDong';
import ThanhToan from '@/models/ThanhToan';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // --- LOGIC FOR TENANT ROLE ---
    if (session.user.role === 'khachThue') {
      const userId = new mongoose.Types.ObjectId(session.user.id);
      
      const [hoaDons, hopDongs, suCos] = await Promise.all([
        HoaDon.find({ khachThue: userId }),
        HopDong.find({ 
          $or: [{ khachThueId: userId }, { nguoiDaiDien: userId }],
          trangThai: 'hoatDong' 
        }),
        SuCo.find({ khachThue: userId, trangThai: { $in: ['moi', 'dangXuLy'] } })
      ]);

      const tongNo = hoaDons.reduce((sum, hd) => sum + (hd.conLai || 0), 0);
      const hoaDonChuaThanhToan = hoaDons.filter(hd => hd.trangThai !== 'daThanhToan').length;
      const hoaDonQuaHan = hoaDons.filter(hd => hd.trangThai === 'quaHan' || (hd.trangThai !== 'daThanhToan' && new Date(hd.hanThanhToan) < new Date())).length;

      return NextResponse.json({
        success: true,
        data: {
          role: 'khachThue',
          tongNo,
          hoaDonChuaThanhToan,
          hoaDonQuaHan,
          soHopDongHieuLuc: hopDongs.length,
          suCoDangXuLy: suCos.length
        }
      });
    }

    // --- LOGIC FOR OWNER / ADMIN ---
    const { searchParams } = new URL(request.url);
    const toaNhaIdFilter = searchParams.get('toaNhaId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    
    let activeToaNhaIds: any[] = [];
    if (toaNhaIdFilter && toaNhaIdFilter !== 'all') {
      const isAccessible = accessibleToaNhaIds === null || accessibleToaNhaIds.some(id => id.toString() === toaNhaIdFilter);
      if (isAccessible) {
        activeToaNhaIds = [new mongoose.Types.ObjectId(toaNhaIdFilter)];
      } else {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    } else if (accessibleToaNhaIds !== null) {
      activeToaNhaIds = accessibleToaNhaIds;
    }

    let phongQuery: any = {};
    if (accessibleToaNhaIds !== null) {
      if (accessibleToaNhaIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            tongSoPhong: 0, phongTrong: 0, phongDangThue: 0, phongBaoTri: 0,
            doanhThuThang: 0, doanhThuNam: 0, tongNoKhongThu: 0, soHoaDonQuaHan: 0,
            suCoCanXuLy: 0, hopDongSapHetHan: 0, tyLeThayDoiDoanhThu: 0,
            doanhThuVaCongNo6Thang: [], hoaDonQuaHanList: [], hopDongSapHetHanList: []
          },
        });
      }
      phongQuery.toaNha = { $in: activeToaNhaIds.length > 0 ? activeToaNhaIds : accessibleToaNhaIds };
    }

    const phongs = await Phong.find(phongQuery).select('_id');
    const phongIds = phongs.map(p => p._id);
    const phongIdStrings = phongs.map(p => p._id.toString());
    
    // Tạo bộ lọc truy vấn linh hoạt (hỗ trợ cả ObjectId và String ID)
    const relationQuery = { 
      $or: [
        { phong: { $in: phongIds } },
        { phong: { $in: phongIdStrings } }
      ]
    };

    const now = new Date();
    
    // Tự động cập nhật trạng thái quá hạn toàn hệ thống (không giới hạn theo phòng để đảm bảo tính nhất quán)
    await HoaDon.updateMany(
      {
        trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] },
        hanThanhToan: { $lt: now }
      },
      { $set: { trangThai: 'quaHan' } }
    );

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const [
      totalPhong, 
      phongTrong, 
      phongDangThue, 
      phongBaoTri,
      suCoCanXuLy,
      hopDongSapHetHan,
      hoaDonQuaHanCount,
      tongNoChuaThu
    ] = await Promise.all([
      Phong.countDocuments(phongQuery),
      Phong.countDocuments({ ...phongQuery, trangThai: 'trong' }),
      Phong.countDocuments({ ...phongQuery, trangThai: 'dangThue' }),
      Phong.countDocuments({ ...phongQuery, trangThai: 'baoTri' }),
      SuCo.countDocuments({ ...relationQuery, trangThai: { $in: ['moi', 'dangXuLy'] } }),
      HopDong.countDocuments({ 
        $and: [
          relationQuery,
          {
            ngayKetThuc: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
            trangThai: { $in: ['hoatDong', 'choDuyetGiaHan', 'choDuyetHuy'] }
          }
        ]
      }),
      HoaDon.countDocuments({
        $and: [
          relationQuery,
          {
            $or: [
              { trangThai: 'quaHan' },
              { 
                trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] },
                hanThanhToan: { $lt: now }
              }
            ]
          }
        ]
      }),
      HoaDon.aggregate([
        { 
          $match: { 
            $and: [
              relationQuery,
              {
                $or: [
                  { trangThai: 'quaHan' },
                  { trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] } } 
                ]
              }
            ]
          } 
        },
        { $group: { _id: null, total: { $sum: '$conLai' } } }
      ]).then(res => res[0]?.total || 0)
    ]);

    const getRevenueInRange = async (start: Date, end: Date) => {
      const res = await ThanhToan.aggregate([
        {
          $match: {
            ngayThanhToan: { $gte: start, $lte: end },
            trangThai: { $ne: 'tuChoi' }
          }
        },
        {
          $lookup: {
            from: 'hoadons',
            localField: 'hoaDon',
            foreignField: '_id',
            as: 'hoaDonInfo'
          }
        },
        { $unwind: '$hoaDonInfo' },
        { 
          $match: { 
            'hoaDonInfo.phong': { $in: phongIds }
          }
        },
        { $group: { _id: null, total: { $sum: '$soTien' } } }
      ]);
      return res[0]?.total || 0;
    };

    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [doanhThuThang, doanhThuPrevThang] = await Promise.all([
      getRevenueInRange(startOfCurrentMonth, endOfCurrentMonth),
      getRevenueInRange(startOfPrevMonth, endOfPrevMonth)
    ]);

    let tyLeThayDoi = 0;
    if (doanhThuPrevThang > 0) {
      tyLeThayDoi = Math.round(((doanhThuThang - doanhThuPrevThang) / doanhThuPrevThang) * 100);
    } else if (doanhThuThang > 0) {
      tyLeThayDoi = 100;
    }

    const trendMonths = 6;
    const trendData = [];
    for (let i = trendMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);

      const [daThu, conNo] = await Promise.all([
        getRevenueInRange(start, end),
        HoaDon.aggregate([
          { 
            $match: { 
              ...relationQuery, 
              thang: m, 
              nam: y,
              trangThai: { $ne: 'daHuy' } 
            } 
          },
          { $group: { _id: null, total: { $sum: '$conLai' } } }
        ]).then(res => res[0]?.total || 0)
      ]);

      trendData.push({ thang: m, nam: y, label: `Tháng ${m}/${y}`, daThu, conNo });
    }

    const hoaDonQuaHanList = await HoaDon.find({
      $and: [
        relationQuery,
        {
          $or: [
            { trangThai: 'quaHan' },
            { 
              trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] },
              hanThanhToan: { $lt: now }
            }
          ]
        }
      ]
    })
    .sort({ hanThanhToan: 1 })
    .limit(10)
    .populate('phong', 'maPhong');

    const KhachThueModel = mongoose.models.KhachThue || mongoose.model('KhachThue');
    const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
    
    const formattedHoaDonQuaHan = await Promise.all(hoaDonQuaHanList.map(async (hd: any) => {
      let tenKhach = 'N/A';
      if (hd.khachThue) {
        let ktInfo: any = await KhachThueModel.findById(hd.khachThue).select('hoTen').lean();
        if (!ktInfo) {
          const ndInfo: any = await NguoiDungModel.findById(hd.khachThue).select('ten name').lean();
          if (ndInfo) {
            tenKhach = ndInfo.ten || ndInfo.name || 'Khách thuê';
          }
        } else {
          tenKhach = ktInfo.hoTen;
        }

        if (tenKhach === 'N/A' && hd.hopDong) {
          const hdDoc = await HopDong.findById((hd.hopDong as any)._id || hd.hopDong).select('snapshotKhachThue').lean() as any;
          const snap = hdDoc?.snapshotKhachThue?.find((s: any) => s.id === hd.khachThue.toString());
          if (snap) tenKhach = snap.hoTen || 'Khách thuê';
        }
      }

      return {
        _id: hd._id,
        tenKhach,
        maPhong: hd.phong?.maPhong || 'N/A',
        soTien: hd.conLai,
        soNgayQuaHan: Math.ceil((now.getTime() - new Date(hd.hanThanhToan).getTime()) / (24 * 60 * 60 * 1000))
      };
    }));

    const hopDongSapHetHanList = await HopDong.find({
      $and: [
        relationQuery,
        {
          ngayKetThuc: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
          trangThai: { $in: ['hoatDong', 'choDuyetGiaHan', 'choDuyetHuy'] }
        }
      ]
    })
    .sort({ ngayKetThuc: 1 })
    .limit(10)
    .populate('phong', 'maPhong');

    const formattedHopDongSapHetHan = await Promise.all(hopDongSapHetHanList.map(async (hd: any) => {
      let tenKhach = 'N/A';
      const kId = hd.nguoiDaiDien?._id || hd.nguoiDaiDien;
      
      if (kId) {
        let ktInfo: any = await KhachThueModel.findById(kId).select('hoTen').lean();
        if (!ktInfo) {
          const ndInfo: any = await NguoiDungModel.findById(kId).select('ten name').lean();
          if (ndInfo) {
            tenKhach = ndInfo.ten || ndInfo.name || 'Khách thuê';
          }
        } else {
          tenKhach = ktInfo.hoTen;
        }

        if (tenKhach === 'N/A' && hd.snapshotKhachThue) {
          const snap = hd.snapshotKhachThue.find((s: any) => s.id === kId.toString() || s.laNoiDaiDien);
          if (snap) tenKhach = snap.hoTen || 'Khách thuê';
        }
      }

      return {
        _id: hd._id,
        tenKhach,
        maPhong: hd.phong?.maPhong || 'N/A',
        ngayHetHan: hd.ngayKetThuc,
        soNgayConLai: Math.ceil((new Date(hd.ngayKetThuc).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      };
    }));

    return NextResponse.json({
      success: true,
      data: {
        tongSoPhong: totalPhong,
        phongTrong,
        phongDangThue,
        phongBaoTri,
        doanhThuThang,
        tyLeThayDoiDoanhThu: tyLeThayDoi,
        tongNoKhongThu: tongNoChuaThu,
        soHoaDonQuaHan: hoaDonQuaHanCount,
        suCoCanXuLy,
        hopDongSapHetHan,
        doanhThuVaCongNo6Thang: trendData,
        hoaDonQuaHanList: formattedHoaDonQuaHan,
        hopDongSapHetHanList: formattedHopDongSapHetHan
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
