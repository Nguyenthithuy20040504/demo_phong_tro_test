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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('Dashboard Stats: No session found');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Dashboard Stats: User role:', session.user.role, 'ID:', session.user.id);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const toaNhaIdFilter = searchParams.get('toaNhaId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    
    // Determine the active buildings for this request
    let activeToaNhaIds: any[] = [];
    if (toaNhaIdFilter && toaNhaIdFilter !== 'all') {
      // If filtering by specific building, check if it's accessible
      const isAccessible = accessibleToaNhaIds === null || accessibleToaNhaIds.some(id => id.toString() === toaNhaIdFilter);
      if (isAccessible) {
        activeToaNhaIds = [toaNhaIdFilter];
      } else {
        // Requested building is not accessible
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    } else if (accessibleToaNhaIds !== null) {
      activeToaNhaIds = accessibleToaNhaIds;
    }

    let phongQuery: any = {};
    if (activeToaNhaIds.length > 0 || accessibleToaNhaIds !== null) {
      if (accessibleToaNhaIds !== null && accessibleToaNhaIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            tongSoPhong: 0, phongTrong: 0, phongDangThue: 0, phongBaoTri: 0,
            doanhThuThang: 0, doanhThuNam: 0, hoaDonSapDenHan: 0,
            suCoCanXuLy: 0, hopDongSapHetHan: 0,
          },
        });
      }
      phongQuery.toaNha = { $in: (activeToaNhaIds.length > 0 ? activeToaNhaIds : accessibleToaNhaIds) as any };
    }

    // Get room IDs for filtering other collections
    const phongs = await Phong.find(phongQuery).select('_id');
    const phongIds = phongs.map(p => p._id);
    
    let hoaDonSuCoQuery: any = { phong: { $in: phongIds } };
    
    const hopDongs = await HopDong.find({ phong: { $in: phongIds } }).select('_id');
    const hopDongIds = hopDongs.map(hd => hd._id);
    const hoaDonsForThanhToan = await HoaDon.find({ hopDong: { $in: hopDongIds } }).select('_id');
    const hoaDonIds = hoaDonsForThanhToan.map(hd => hd._id);
    let thanhToanQuery: any = { hoaDon: { $in: hoaDonIds } };

    // Set time range for revenue
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    const endOfCurrentYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Custom date range for filtering
    let filterStartDate = startDateParam ? new Date(startDateParam) : null;
    let filterEndDate = endDateParam ? new Date(endDateParam) : null;
    if (filterEndDate) filterEndDate.setHours(23, 59, 59, 999);

    // Get room stats
    const totalPhong = await Phong.countDocuments(phongQuery);
    const phongTrong = await Phong.countDocuments({ ...phongQuery, trangThai: 'trong' });
    const phongDangThue = await Phong.countDocuments({ ...phongQuery, trangThai: 'dangThue' });
    const phongBaoTri = await Phong.countDocuments({ ...phongQuery, trangThai: 'baoTri' });

    // Revenue aggregation helper
    const getRevenue = async (start: Date, end: Date) => {
      const result = await ThanhToan.aggregate([
        {
          $match: {
            ...thanhToanQuery,
            ngayThanhToan: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$soTien' }
          }
        }
      ]);
      return result[0]?.total || 0;
    };

    const doanhThuThang = await getRevenue(startOfCurrentMonth, endOfCurrentMonth);
    const doanhThuNam = await getRevenue(startOfCurrentYear, endOfCurrentYear);
    
    // If filter dates provided, calculate custom revenue
    let filteredRevenue = null;
    if (filterStartDate && filterEndDate) {
      filteredRevenue = await getRevenue(filterStartDate, filterEndDate);
    }

    // Get pending invoices (due in next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const hoaDonSapDenHan = await HoaDon.countDocuments({
      ...hoaDonSuCoQuery,
      hanThanhToan: { $lte: nextWeek },
      trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] }
    });

    // Get pending issues
    const suCoCanXuLy = await SuCo.countDocuments({
      ...hoaDonSuCoQuery,
      trangThai: { $in: ['moi', 'dangXuLy'] }
    });

    // Get contracts expiring in next 30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    
    const hopDongSapHetHan = await HopDong.countDocuments({
      ...hoaDonSuCoQuery,
      ngayKetThuc: { $lte: nextMonth },
      trangThai: 'hoatDong'
    });

    // Monthly revenue breakdown for current year
    const startOfCurrentYearFull = new Date(now.getFullYear(), 0, 1);
    const endOfCurrentYearFull = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const monthlyRevenueRaw = await ThanhToan.aggregate([
      {
        $match: {
          ...thanhToanQuery,
          ngayThanhToan: { $gte: startOfCurrentYearFull, $lte: endOfCurrentYearFull }
        }
      },
      {
        $group: {
          _id: { $month: '$ngayThanhToan' },
          total: { $sum: '$soTien' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Fill in missing months with 0
    const doanhThuTheoThang = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlyRevenueRaw.find(m => m._id === i + 1);
      return {
        thang: i + 1,
        total: monthData ? monthData.total : 0
      };
    });

    // ===== NEW: 6-month revenue vs debt comparison =====
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Revenue per month (last 6 months)
    const revenueByMonth = await ThanhToan.aggregate([
      {
        $match: {
          ...thanhToanQuery,
          ngayThanhToan: { $gte: sixMonthsAgo, $lte: endOfThisMonth }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$ngayThanhToan' }, year: { $year: '$ngayThanhToan' } },
          total: { $sum: '$soTien' }
        }
      }
    ]);

    // Debt per month (last 6 months) - based on invoices
    const debtByMonth = await HoaDon.aggregate([
      {
        $match: {
          hopDong: { $in: hopDongIds },
          trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] },
        }
      },
      {
        $group: {
          _id: { month: { $month: '$hanThanhToan' }, year: { $year: '$hanThanhToan' } },
          total: { $sum: '$conLai' }
        }
      }
    ]);

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

    // ===== NEW: Total unpaid debt =====
    const totalDebtResult = await HoaDon.aggregate([
      {
        $match: {
          hopDong: { $in: hopDongIds },
          trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] },
        }
      },
      { $group: { _id: null, total: { $sum: '$conLai' } } }
    ]);
    const tongNoKhongThu = totalDebtResult[0]?.total || 0;

    // Count overdue invoices
    const soHoaDonQuaHan = await HoaDon.countDocuments({
      hopDong: { $in: hopDongIds },
      trangThai: 'quaHan',
    });

    // ===== NEW: Revenue change percentage (vs last month) =====
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const doanhThuThangTruoc = await getRevenue(lastMonthStart, lastMonthEnd);
    const tyLeThayDoiDoanhThu = doanhThuThangTruoc > 0
      ? Number((((doanhThuThang - doanhThuThangTruoc) / doanhThuThangTruoc) * 100).toFixed(1))
      : 0;

    // ===== NEW: Top 5 overdue invoices with details =====
    const KhachThue = (await import('@/models/KhachThue')).default;
    const hoaDonQuaHanRaw = await HoaDon.find({
      hopDong: { $in: hopDongIds },
      trangThai: { $in: ['quaHan', 'chuaThanhToan'] },
      hanThanhToan: { $lt: now },
    })
      .sort({ hanThanhToan: 1 })
      .limit(5)
      .populate({ path: 'khachThue', select: 'hoTen' })
      .populate({ path: 'phong', select: 'maPhong' })
      .lean();

    const hoaDonQuaHanList = hoaDonQuaHanRaw.map((hd: any) => ({
      _id: hd._id.toString(),
      tenKhach: hd.khachThue?.hoTen || 'N/A',
      maPhong: hd.phong?.maPhong || 'N/A',
      soTien: hd.conLai || hd.tongTien || 0,
      soNgayQuaHan: Math.max(0, Math.floor((now.getTime() - new Date(hd.hanThanhToan).getTime()) / (1000 * 60 * 60 * 24))),
    }));

    // ===== NEW: Expiring contracts (15-30 days) with details =====
    const fifteenDaysLater = new Date();
    fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
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

    const stats = {
      tongSoPhong: totalPhong,
      phongTrong,
      phongDangThue,
      phongBaoTri,
      doanhThuThang,
      doanhThuNam,
      filteredRevenue,
      doanhThuTheoThang,
      hoaDonSapDenHan,
      suCoCanXuLy,
      hopDongSapHetHan,
      // New fields
      tongNoKhongThu,
      soHoaDonQuaHan,
      tyLeThayDoiDoanhThu,
      doanhThuVaCongNo6Thang,
      hoaDonQuaHanList,
      hopDongSapHetHanList,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
