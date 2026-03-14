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

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    const hasToaNhaFilter = accessibleToaNhaIds !== null;
    let phongIds: any[] = [];
    let phongQuery: any = {};
    let hoaDonSuCoQuery: any = {};
    let thanhToanQuery: any = {};

    if (hasToaNhaFilter) {
      if (accessibleToaNhaIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            tongSoPhong: 0, phongTrong: 0, phongDangThue: 0, phongBaoTri: 0,
            doanhThuThang: 0, doanhThuNam: 0, hoaDonSapDenHan: 0,
            suCoCanXuLy: 0, hopDongSapHetHan: 0,
          },
        });
      }
      
      const phongs = await Phong.find({ toaNha: { $in: accessibleToaNhaIds } }).select('_id');
      phongIds = phongs.map(p => p._id);
      
      if (phongIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            tongSoPhong: 0, phongTrong: 0, phongDangThue: 0, phongBaoTri: 0,
            doanhThuThang: 0, doanhThuNam: 0, hoaDonSapDenHan: 0,
            suCoCanXuLy: 0, hopDongSapHetHan: 0,
          },
        });
      }

      phongQuery.toaNha = { $in: accessibleToaNhaIds };
      hoaDonSuCoQuery.phong = { $in: phongIds };
      
      const hopDongs = await HopDong.find({ phong: { $in: phongIds } }).select('_id');
      const hopDongIds = hopDongs.map(hd => hd._id);
      
      // Fix: ThanhToan model belongs to HoaDon, which belongs to HopDong
      const hoaDons = await HoaDon.find({ hopDong: { $in: hopDongIds } }).select('_id');
      const hoaDonIds = hoaDons.map(hd => hd._id);
      thanhToanQuery.hoaDon = { $in: hoaDonIds };
    }

    // Get room stats
    const totalPhong = await Phong.countDocuments(phongQuery);
    const phongTrong = await Phong.countDocuments({ ...phongQuery, trangThai: 'trong' });
    const phongDangThue = await Phong.countDocuments({ ...phongQuery, trangThai: 'dangThue' });
    const phongBaoTri = await Phong.countDocuments({ ...phongQuery, trangThai: 'baoTri' });

    // Get revenue stats
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    const doanhThuThang = await ThanhToan.aggregate([
      {
        $match: {
          ...thanhToanQuery,
          ngayThanhToan: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$soTien' }
        }
      }
    ]);

    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
    
    const doanhThuNam = await ThanhToan.aggregate([
      {
        $match: {
          ...thanhToanQuery,
          ngayThanhToan: {
            $gte: startOfYear,
            $lte: endOfYear
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$soTien' }
        }
      }
    ]);

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

    const stats = {
      tongSoPhong: totalPhong,
      phongTrong,
      phongDangThue,
      phongBaoTri,
      doanhThuThang: doanhThuThang[0]?.total || 0,
      doanhThuNam: doanhThuNam[0]?.total || 0,
      hoaDonSapDenHan,
      suCoCanXuLy,
      hopDongSapHetHan,
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
