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
          suCoDangXuLy: suCos.length,
          tongSoPhong: 0, phongTrong: 0, phongDangThue: 0, 
          doanhThuThang: 0, doanhThuNam: 0, tyLeThayDoiDoanhThu: 0
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

    // Common Base Query for Filters
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

    // Find all room IDs to filter related collections
    const phongs = await Phong.find(phongQuery).select('_id');
    const phongIds = phongs.map(p => p._id);
    const relationQuery = { phong: { $in: phongIds } };
    const hoaDonSuCoQuery = relationQuery;
    const allHoaDons = await HoaDon.find(relationQuery).select('_id');
    const hoaDonIds = allHoaDons.map(hd => hd._id);
    const thanhToanQuery = { hoaDon: { $in: hoaDonIds } };
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // 1. Summary Metrics
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
        ...relationQuery, 
        ngayKetThuc: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        trangThai: 'hoatDong'
      }),
      HoaDon.countDocuments({
        ...relationQuery,
        trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] },
        hanThanhToan: { $lt: now }
      }),
      HoaDon.aggregate([
        { $match: { ...relationQuery, trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] } } },
        { $group: { _id: null, total: { $sum: '$conLai' } } }
      ]).then(res => res[0]?.total || 0)
    ]);

    // 2. Revenue calculation
    const getRevenueInRange = async (start: Date, end: Date) => {
      const res = await ThanhToan.aggregate([
        {
          $match: {
            ngayThanhToan: { $gte: start, $lte: end },
            trangThai: { $ne: 'tuChoi' }
          }
        },
        // We need to filter based on which building the payment's invoice belongs to
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

    const getRevenue = getRevenueInRange;
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    const endOfCurrentYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const [doanhThuThang, doanhThuNam] = await Promise.all([
      getRevenue(startOfCurrentMonth, endOfCurrentMonth),
      getRevenue(startOfCurrentYear, endOfCurrentYear)
    ]);
    
    // Additional landlord-only metrics...
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Count overdue invoices
    const soHoaDonQuaHanPromise = HoaDon.countDocuments({
      phong: { $in: phongIds },
      trangThai: 'quaHan',
    });

    // ===== NEW: Revenue change percentage (vs last month) =====
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const doanhThuThangTruocPromise = getRevenue(lastMonthStart, lastMonthEnd);

    // ===== NEW: Top 5 overdue invoices with details =====
    const KhachThue = (await import('@/models/KhachThue')).default;
    const hoaDonQuaHanRawPromise = HoaDon.find({
      phong: { $in: phongIds },
      trangThai: { $in: ['quaHan', 'chuaThanhToan'] },
      hanThanhToan: { $lt: now },
    })
      .sort({ hanThanhToan: 1 })
      .limit(5)
      .populate({ path: 'khachThue', select: 'hoTen' })
      .populate({ path: 'phong', select: 'maPhong' })
      .lean();
      
    // Variables for dates needed in concurrent queries
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    
    const startOfCurrentYearFull = new Date(now.getFullYear(), 0, 1);
    const endOfCurrentYearFull = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Combine complex queries in parallel
    const [
      hoaDonSapDenHan,
      // suCoCanXuLy already fetched as suCoCanXuLyMet
      suCoCanXuLyCount,
      hopDongSapHetHanCount,
      monthlyRevenueRaw,
      revenueByMonth,
      debtByMonth,
      totalDebtResult,
      soHoaDonQuaHan,
      doanhThuThangTruoc,
      hoaDonQuaHanRaw
    ] = await Promise.all([
      HoaDon.countDocuments({
        ...hoaDonSuCoQuery,
        hanThanhToan: { $lte: nextWeek },
        trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] }
      }),
      SuCo.countDocuments({
        ...hoaDonSuCoQuery,
        trangThai: { $in: ['moi', 'dangXuLy'] }
      }),
      HopDong.countDocuments({
        ...hoaDonSuCoQuery,
        ngayKetThuc: { $lte: nextMonth },
        trangThai: 'hoatDong'
      }),
      ThanhToan.aggregate([
        { $match: { ...thanhToanQuery, ngayThanhToan: { $gte: startOfCurrentYearFull, $lte: endOfCurrentYearFull } } },
        { $group: { _id: { $month: '$ngayThanhToan' }, total: { $sum: '$soTien' } } },
        { $sort: { '_id': 1 } }
      ]),
      ThanhToan.aggregate([
        { $match: { ...thanhToanQuery, ngayThanhToan: { $gte: sixMonthsAgo, $lte: endOfThisMonth } } },
        { $group: { _id: { month: { $month: '$ngayThanhToan' }, year: { $year: '$ngayThanhToan' } }, total: { $sum: '$soTien' } } }
      ]),
      HoaDon.aggregate([
        { $match: { phong: { $in: phongIds }, trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] } } },
        { $group: { _id: { month: { $month: '$hanThanhToan' }, year: { $year: '$hanThanhToan' } }, total: { $sum: '$conLai' } } }
      ]),
      HoaDon.aggregate([
        { $match: { phong: { $in: phongIds }, trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] } } },
        { $group: { _id: null, total: { $sum: '$conLai' } } }
      ]),
      soHoaDonQuaHanPromise,
      doanhThuThangTruocPromise,
      hoaDonQuaHanRawPromise
    ]);

    // Use specific counts for response
    const finalSuCoCanXuLy = suCoCanXuLyCount || suCoCanXuLy;
    const finalHopDongSapHetHan = hopDongSapHetHanCount || hopDongSapHetHan;

    // Fill in missing months with 0
    const doanhThuTheoThang = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlyRevenueRaw.find((m: any) => m._id === i + 1);
      return {
        thang: i + 1,
        total: monthData ? monthData.total : 0
      };
    });

    const doanhThuVaCongNo6Thang = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const rev = revenueByMonth.find((r: any) => r._id.month === m && r._id.year === y);
      const debt = debtByMonth.find((r: any) => r._id.month === m && r._id.year === y);
      doanhThuVaCongNo6Thang.push({
        thang: m,
        nam: y,
        label: `T${m}/${String(y).slice(-2)}`,
        daThu: rev?.total || 0,
        conNo: debt?.total || 0,
      });
    }

    const tongNoKhongThu = totalDebtResult[0]?.total || 0;
    
    const tyLeThayDoiDoanhThu = doanhThuThangTruoc > 0
      ? Number((((doanhThuThang - doanhThuThangTruoc) / doanhThuThangTruoc) * 100).toFixed(1))
      : 0;

    const hoaDonQuaHanList = hoaDonQuaHanRaw.map((hd: any) => ({
      _id: hd._id.toString(),
      tenKhach: hd.khachThue?.hoTen || 'N/A',
      maPhong: hd.phong?.maPhong || 'N/A',
      soTien: hd.conLai || hd.tongTien || 0,
      soNgayQuaHan: Math.max(0, Math.floor((now.getTime() - new Date(hd.hanThanhToan).getTime()) / (1000 * 60 * 60 * 24))),
    }));

    // ===== NEW: Expiring contracts (15-30 days) with details =====
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const hopDongSapHetHanRaw = await HopDong.find({
      phong: { $in: phongIds },
      trangThai: 'hoatDong',
      ngayKetThuc: { $gte: now, $lte: thirtyDaysLater },
    })
      .sort({ ngayKetThuc: 1 })
      .limit(5)
      .populate({ path: 'phong', select: 'maPhong' })
      .populate({ path: 'nguoiDaiDien', select: 'hoTen' })
      .lean();

    const hopDongSapHetHanList = hopDongSapHetHanRaw.map((hd: any) => ({
      _id: hd._id.toString(),
      tenKhach: hd.nguoiDaiDien?.hoTen || 'N/A',
      maPhong: hd.phong?.maPhong || 'N/A',
      ngayHetHan: new Date(hd.ngayKetThuc).toLocaleDateString('vi-VN'),
      soNgayConLai: Math.max(0, Math.ceil((new Date(hd.ngayKetThuc).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    }));

    return NextResponse.json({
      success: true,
      data: {
        tongSoPhong: totalPhong,
        phongTrong,
        phongDangThue,
        phongBaoTri,
        doanhThuThang,
        doanhThuNam,
        doanhThuTheoThang,
        hoaDonSapDenHan,
        suCoCanXuLy: finalSuCoCanXuLy,
        hopDongSapHetHan: finalHopDongSapHetHan,
        tongNoKhongThu,
        soHoaDonQuaHan,
        tyLeThayDoiDoanhThu,
        doanhThuVaCongNo6Thang,
        hoaDonQuaHanList,
        hopDongSapHetHanList,
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
