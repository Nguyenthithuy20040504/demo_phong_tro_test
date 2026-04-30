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
      console.log('Dashboard Stats: No session found');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Dashboard Stats: User role:', session.user.role, 'ID:', session.user.id);

    await dbConnect();

    // --- LOGIC DÀNH CHO KHÁCH THUÊ ---
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
          // Trả về mock/rỗng cho các field của chủ nhà để tránh crash UI nếu dùng chung component
          tongSoPhong: 0, phongTrong: 0, phongDangThue: 0, 
          doanhThuThang: 0, doanhThuNam: 0, tyLeThayDoiDoanhThu: 0
        }
      });
    }

    // --- LOGIC DÀNH CHO CHỦ NHÀ / ADMIN (Giữ nguyên và tối ưu) ---
    const { searchParams } = new URL(request.url);
    const toaNhaIdFilter = searchParams.get('toaNhaId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // ... (Toàn bộ logic phía dưới dành cho Chủ nhà)
    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    
    // Determine the active buildings for this request
    let activeToaNhaIds: any[] = [];
    if (toaNhaIdFilter && toaNhaIdFilter !== 'all') {
      // If filtering by specific building, check if it's accessible
      const isAccessible = accessibleToaNhaIds === null || accessibleToaNhaIds.some(id => id.toString() === toaNhaIdFilter);
      if (isAccessible) {
        activeToaNhaIds = [toaNhaIdFilter];
      } else {
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
    
    // Tìm tất cả hóa đơn thuộc về các phòng này để tính toán doanh thu/công nợ
    const allHoaDons = await HoaDon.find({ phong: { $in: phongIds } }).select('_id hopDong');
    const hoaDonIds = allHoaDons.map(hd => hd._id);

    let thanhToanQuery: any = { hoaDon: { $in: hoaDonIds } };

    // Set time range for revenue
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    const endOfCurrentYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Get room stats in parallel
    const [totalPhong, phongTrong, phongDangThue, phongBaoTri] = await Promise.all([
      Phong.countDocuments(phongQuery),
      Phong.countDocuments({ ...phongQuery, trangThai: 'trong' }),
      Phong.countDocuments({ ...phongQuery, trangThai: 'dangThue' }),
      Phong.countDocuments({ ...phongQuery, trangThai: 'baoTri' })
    ]);

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

    const [doanhThuThang, doanhThuNam] = await Promise.all([
      getRevenue(startOfCurrentMonth, endOfCurrentMonth),
      getRevenue(startOfCurrentYear, endOfCurrentYear)
    ]);
    
    // Additional landlord-only metrics...
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const [hoaDonSapDenHan, suCoCanXuLy, hopDongSapHetHan] = await Promise.all([
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
        ngayBatDau: { $lte: now },
        ngayKetThuc: { $gte: now },
        trangThai: 'hoatDong'
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tongSoPhong: totalPhong,
        phongTrong,
        phongDangThue,
        phongBaoTri,
        doanhThuThang,
        doanhThuNam,
        hoaDonSapDenHan,
        suCoCanXuLy,
        hopDongSapHetHan
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
