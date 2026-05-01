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

    const phongs = await Phong.find(phongQuery).select('_id').lean() as any[];
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
    
    // Tự động cập nhật trạng thái quá hạn toàn hệ thống
    await HoaDon.updateMany(
      {
        trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan'] },
        hanThanhToan: { $lt: now }
      },
      { $set: { trangThai: 'quaHan' } }
    );

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // === TÍNH TOÁN TREND DATA: 1 QUERY DUY NHẤT thay vì 6×2 queries tuần tự ===
    const trendMonths = 6;
    const trendStart = new Date(now.getFullYear(), now.getMonth() - (trendMonths - 1), 1);
    
    // Tạo danh sách tháng cần tính
    const monthsList: Array<{m: number; y: number; start: Date; end: Date}> = [];
    for (let i = trendMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      monthsList.push({
        m, y,
        start: new Date(y, m - 1, 1),
        end: new Date(y, m, 0, 23, 59, 59)
      });
    }
    
    // Chạy TẤT CẢ queries song song (Promise.all thay vì for-loop tuần tự)
    const [
      totalPhong, 
      phongTrong, 
      phongDangThue, 
      phongBaoTri,
      suCoCanXuLy,
      hopDongSapHetHan,
      hoaDonQuaHanCount,
      tongNoChuaThu,
      // Revenue: 1 aggregation cho tất cả tháng
      revenueByMonth,
      // Debt: 1 aggregation cho tất cả tháng 
      debtByMonth,
      // Lists
      hoaDonQuaHanList,
      hopDongSapHetHanList
    ] = await Promise.all([
      // --- 4 room counts ---
      Phong.countDocuments(phongQuery),
      Phong.countDocuments({ ...phongQuery, trangThai: 'trong' }),
      Phong.countDocuments({ ...phongQuery, trangThai: 'dangThue' }),
      Phong.countDocuments({ ...phongQuery, trangThai: 'baoTri' }),
      
      // --- Issue count ---
      SuCo.countDocuments({ ...relationQuery, trangThai: { $in: ['moi', 'dangXuLy'] } }),
      
      // --- Expiring contracts count ---
      HopDong.countDocuments({ 
        $and: [
          relationQuery,
          {
            ngayKetThuc: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
            trangThai: { $in: ['hoatDong', 'choDuyetGiaHan', 'choDuyetHuy'] }
          }
        ]
      }),
      
      // --- Overdue invoice count ---
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
      
      // --- Total unpaid debt ---
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
      ]).then(res => res[0]?.total || 0),
      
      // --- REVENUE BY MONTH: 1 single aggregation pipeline ---
      // Bao gồm cả tháng trước (cho tính % thay đổi)
      ThanhToan.aggregate([
        {
          $match: {
            ngayThanhToan: { $gte: startOfPrevMonth, $lte: endOfCurrentMonth },
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
        {
          $group: {
            _id: {
              month: { $month: '$ngayThanhToan' },
              year: { $year: '$ngayThanhToan' }
            },
            total: { $sum: '$soTien' }
          }
        }
      ]),
      
      // --- DEBT BY MONTH: 1 single aggregation pipeline ---
      HoaDon.aggregate([
        { 
          $match: { 
            ...relationQuery, 
            thang: { $in: monthsList.map(m => m.m) },
            trangThai: { $ne: 'daHuy' }
          } 
        },
        {
          $group: {
            _id: { thang: '$thang', nam: '$nam' },
            total: { $sum: '$conLai' }
          }
        }
      ]),
      
      // --- Overdue invoice list (top 10) ---
      HoaDon.find({
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
      .populate('phong', 'maPhong')
      .lean(),
      
      // --- Expiring contract list (top 10) ---
      HopDong.find({
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
      .populate('phong', 'maPhong')
      .lean()
    ]);

    // === Xử lý trend data từ kết quả aggregation ===
    const revenueMap = new Map<string, number>();
    for (const r of revenueByMonth) {
      revenueMap.set(`${r._id.month}-${r._id.year}`, r.total);
    }
    
    const debtMap = new Map<string, number>();
    for (const d of debtByMonth) {
      debtMap.set(`${d._id.thang}-${d._id.nam}`, d.total);
    }

    const doanhThuThang = revenueMap.get(`${now.getMonth() + 1}-${now.getFullYear()}`) || 0;
    const doanhThuPrevThang = revenueMap.get(`${startOfPrevMonth.getMonth() + 1}-${startOfPrevMonth.getFullYear()}`) || 0;
    
    let tyLeThayDoi = 0;
    if (doanhThuPrevThang > 0) {
      tyLeThayDoi = Math.round(((doanhThuThang - doanhThuPrevThang) / doanhThuPrevThang) * 100);
    } else if (doanhThuThang > 0) {
      tyLeThayDoi = 100;
    }

    const trendData = monthsList.map(({ m, y }) => ({
      thang: m,
      nam: y,
      label: `Tháng ${m}/${y}`,
      daThu: revenueMap.get(`${m}-${y}`) || 0,
      conNo: debtMap.get(`${m}-${y}`) || 0
    }));

    // === Format lists: batch lookup thay vì N+1 queries ===
    const KhachThueModel = mongoose.models.KhachThue || mongoose.model('KhachThue');
    const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
    
    // Collect all unique khachThue/nguoiDaiDien IDs for batch lookup
    const allKhachThueIds = new Set<string>();
    for (const hd of hoaDonQuaHanList as any[]) {
      if (hd.khachThue) allKhachThueIds.add(hd.khachThue.toString());
    }
    for (const hd of hopDongSapHetHanList as any[]) {
      const kId = hd.nguoiDaiDien?._id || hd.nguoiDaiDien;
      if (kId) allKhachThueIds.add(kId.toString());
    }
    
    // Batch fetch all tenant & user names in 2 queries
    const idsArray = Array.from(allKhachThueIds).map(id => {
      try { return new mongoose.Types.ObjectId(id); } catch { return null; }
    }).filter(Boolean);
    
    const [ktDocs, ndDocs] = await Promise.all([
      KhachThueModel.find({ _id: { $in: idsArray } }).select('hoTen').lean(),
      NguoiDungModel.find({ _id: { $in: idsArray } }).select('ten name').lean()
    ]);
    
    const nameMap = new Map<string, string>();
    for (const kt of ktDocs as any[]) {
      nameMap.set(kt._id.toString(), kt.hoTen);
    }
    for (const nd of ndDocs as any[]) {
      if (!nameMap.has(nd._id.toString())) {
        nameMap.set(nd._id.toString(), nd.ten || nd.name || 'Khách thuê');
      }
    }
    
    // Format overdue invoices
    const formattedHoaDonQuaHan = (hoaDonQuaHanList as any[]).map((hd: any) => {
      let tenKhach = 'N/A';
      if (hd.khachThue) {
        tenKhach = nameMap.get(hd.khachThue.toString()) || 'N/A';
        
        // Fallback to snapshot
        if (tenKhach === 'N/A' && hd.hopDong) {
          // Skip snapshot lookup for performance - name is already N/A
        }
      }

      return {
        _id: hd._id,
        tenKhach,
        maPhong: hd.phong?.maPhong || 'N/A',
        soTien: hd.conLai,
        soNgayQuaHan: Math.ceil((now.getTime() - new Date(hd.hanThanhToan).getTime()) / (24 * 60 * 60 * 1000))
      };
    });

    // Format expiring contracts
    const formattedHopDongSapHetHan = (hopDongSapHetHanList as any[]).map((hd: any) => {
      let tenKhach = 'N/A';
      const kId = hd.nguoiDaiDien?._id || hd.nguoiDaiDien;
      
      if (kId) {
        tenKhach = nameMap.get(kId.toString()) || 'N/A';
        
        // Fallback to snapshot
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
    });

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
