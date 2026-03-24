import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ThanhToan from '@/models/ThanhToan';
import HoaDon from '@/models/HoaDon';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import Phong from '@/models/Phong';
import mongoose from 'mongoose';

// GET - Lấy danh sách thanh toán
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const hopDongId = searchParams.get('hopDongId');
    const hoaDonId = searchParams.get('hoaDonId');

    const query: any = {};
    
    // Phân quyền: Lọc theo vai trò của người dùng
    if (session.user.role === 'khachThue') {
      // Khách thuê chỉ xem biên lai của chính mình
      const hoaDons = await HoaDon.find({ khachThue: session.user.id }).select('_id');
      query.hoaDon = { $in: hoaDons.map(hd => hd._id) };
    } else if (session.user.role !== 'admin') {
      // Chủ nhà hoặc Nhân viên: Lọc theo các tòa nhà được phép quản lý
      const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
      if (accessibleToaNhaIds !== null) {
        const phongs = await Phong.find({ toaNha: { $in: accessibleToaNhaIds } }).select('_id');
        const phongIds = phongs.map(p => p._id);
        const hoaDons = await HoaDon.find({ phong: { $in: phongIds } }).select('_id');
        query.hoaDon = { $in: hoaDons.map(hd => hd._id) };
      }
    }

    // Áp dụng thêm các bộ lọc từ query params nếu có
    if (hopDongId) {
      const hdQuery: any = { hopDong: hopDongId };
      if (query.hoaDon) hdQuery._id = query.hoaDon;
      
      const hoaDons = await HoaDon.find(hdQuery).select('_id');
      query.hoaDon = { $in: hoaDons.map(hd => hd._id) };
    }
    
    if (hoaDonId) {
      if (query.hoaDon) {
        const allowedIds = query.hoaDon.$in.map((id: any) => id.toString());
        if (!allowedIds.includes(hoaDonId)) {
          return NextResponse.json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 }
          });
        }
      }
      query.hoaDon = hoaDonId;
    }

    const skip = (page - 1) * limit;

    const thanhToans = await ThanhToan.find(query)
      .populate({
        path: 'hoaDon',
        select: 'maHoaDon thang nam tongTien phong khachThue',
        populate: [
          { path: 'phong', select: 'maPhong' },
          { path: 'khachThue', select: 'hoTen' }
        ]
      })
      .populate('nguoiNhan', 'hoTen email')   
      .sort({ ngayThanhToan: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ThanhToan.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: thanhToans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching thanh toan:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Tạo thanh toán mới
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const {
      hoaDonId,
      soTien,
      phuongThuc,
      thongTinChuyenKhoan,
      ngayThanhToan,
      ghiChu,
      anhBienLai
    } = body;

    // Validate required fields
    if (!hoaDonId || !soTien || !phuongThuc) {
      return NextResponse.json(
        { message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Kiểm tra hóa đơn tồn tại
    const hoaDon = await HoaDon.findById(hoaDonId);
    if (!hoaDon) {
      return NextResponse.json(
        { message: 'Hóa đơn không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra số tiền thanh toán không vượt quá số tiền còn lại
    if (soTien > hoaDon.conLai) {
      return NextResponse.json(
        { message: 'Số tiền thanh toán không được vượt quá số tiền còn lại' },
        { status: 400 }
      );
    }

    // Validate thông tin chuyển khoản nếu phương thức là chuyển khoản
    if (phuongThuc === 'chuyenKhoan' && !thongTinChuyenKhoan) {
      return NextResponse.json(
        { message: 'Thông tin chuyển khoản là bắt buộc' },
        { status: 400 }
      );
    }

    // Tạo thanh toán mới
    const thanhToan = new ThanhToan({
      hoaDon: hoaDonId,
      soTien,
      phuongThuc,
      thongTinChuyenKhoan: phuongThuc === 'chuyenKhoan' ? thongTinChuyenKhoan : undefined,
      ngayThanhToan: ngayThanhToan ? new Date(ngayThanhToan) : new Date(),
      nguoiNhan: session.user.id,
      ghiChu,
      anhBienLai
    });

    await thanhToan.save();

    // Cập nhật hóa đơn
    hoaDon.daThanhToan += soTien;
    hoaDon.conLai = hoaDon.tongTien - hoaDon.daThanhToan;
    
    if (hoaDon.conLai <= 0) {
      hoaDon.trangThai = 'daThanhToan';
    } else if (hoaDon.daThanhToan > 0) {
      hoaDon.trangThai = 'daThanhToanMotPhan';
    }

    await hoaDon.save();

    // Populate để trả về dữ liệu đầy đủ
    await thanhToan.populate([
      { path: 'hoaDon', select: 'maHoaDon thang nam tongTien' },
      { path: 'nguoiNhan', select: 'hoTen email' }
    ]);

    // Lấy lại hóa đơn đã cập nhật với đầy đủ thông tin (bao gồm polymorphic khachThue)
    let updatedHoaDon = await HoaDon.findById(hoaDonId)
      .populate('phong', 'maPhong')
      .populate('hopDong', 'maHopDong');

    if (updatedHoaDon) {
      const hoaDonObj = updatedHoaDon.toObject();
      const KhachThueModel = (await import('@/models/KhachThue')).default;
      const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
      
      let ktInfo: any = await KhachThueModel.findById(hoaDonObj.khachThue).select('hoTen soDienThoai').lean();
      if (!ktInfo) {
        const ndInfo: any = await NguoiDungModel.findById(hoaDonObj.khachThue).select('ten name soDienThoai phone').lean();
        if (ndInfo) {
          ktInfo = {
            _id: ndInfo._id,
            hoTen: ndInfo.ten || ndInfo.name || 'Khách thuê',
            soDienThoai: ndInfo.soDienThoai || ndInfo.phone
          };
        }
      }
      updatedHoaDon = {
        ...hoaDonObj,
        khachThue: ktInfo || { _id: hoaDonObj.khachThue, hoTen: 'N/A' }
      } as any;
    }

    return NextResponse.json({
      success: true,
      data: {
        thanhToan,
        hoaDon: updatedHoaDon
      },
      message: 'Tạo thanh toán thành công'
    });
  } catch (error) {
    console.error('Error creating thanh toan:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}