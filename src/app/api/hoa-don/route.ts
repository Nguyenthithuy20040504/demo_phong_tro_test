import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import HopDong from '@/models/HopDong';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessibleToaNhaIds, isToaNhaAccessible } from '@/lib/auth-utils';
import { PhiDichVu } from '@/types';
import mongoose from 'mongoose';

// GET - Lấy danh sách hóa đơn
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const hopDongId = searchParams.get('hopDongId');
    const trangThai = searchParams.get('trangThai');

    // Nếu có ID, lấy hóa đơn cụ thể
    if (id) {
      const hoaDon = await HoaDon.findById(id)
        .populate('hopDong', 'maHopDong')
        .populate('phong', 'maPhong toaNha');

      if (!hoaDon) {
        return NextResponse.json(
          { message: 'Hóa đơn không tồn tại' },
          { status: 404 }
        );
      }

      // Kiểm tra quyền truy cập
      const toaNhaId = (hoaDon.phong as any).toaNha || hoaDon.phong;
      const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
      if (!hasAccess && session.user.role !== 'khachThue') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      // Nếu là khách thuê, kiểm tra xem có phải hóa đơn của mình không
      if (session.user.role === 'khachThue' && hoaDon.khachThue.toString() !== session.user.id) {
        // Cần kiểm tra kỹ hơn nếu dùng SĐT hoặc liên kết khác, tạm thời logic cơ bản
        const userId = session.user.id;
        if (hoaDon.khachThue.toString() !== userId) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
      }

      const hoaDonObj = hoaDon.toObject();

      // Khôi phục thông tin Khách thuê
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
      (hoaDonObj as any).khachThue = ktInfo || { _id: hoaDonObj.khachThue, hoTen: 'N/A' };

      // Xử lý dữ liệu cũ không có chỉ số điện nước
      if (hoaDonObj.chiSoDienBanDau === undefined) {
        hoaDonObj.chiSoDienBanDau = 0;
      }
      if (hoaDonObj.chiSoDienCuoiKy === undefined) {
        hoaDonObj.chiSoDienCuoiKy = hoaDonObj.chiSoDienBanDau;
      }
      if (hoaDonObj.chiSoNuocBanDau === undefined) {
        hoaDonObj.chiSoNuocBanDau = 0;
      }
      if (hoaDonObj.chiSoNuocCuoiKy === undefined) {
        hoaDonObj.chiSoNuocCuoiKy = hoaDonObj.chiSoNuocBanDau;
      }

      return NextResponse.json({
        success: true,
        data: hoaDonObj
      });
    }

    const query: Record<string, unknown> = {};
    if (hopDongId) {
      query.hopDong = hopDongId;
    }
    if (trangThai) {
      if (trangThai.includes(',')) {
        query.trangThai = { $in: trangThai.split(',') };
      } else {
        query.trangThai = trangThai;
      }
    }

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);

    if (session.user.role === 'khachThue') {
      // Logic dành cho khách thuê: Chỉ lấy hóa đơn của chính họ
      const userId = session.user.id;
      const linkedIds = [new mongoose.Types.ObjectId(userId)];

      // Tìm khách thuê theo phone nếu có
      const KhachThueModel = (await import('@/models/KhachThue')).default;
      const kt = await KhachThueModel.findOne({
        $or: [
          { _id: userId },
          { soDienThoai: session.user.phone }
        ]
      }).select('_id');

      if (kt && kt._id.toString() !== userId) {
        linkedIds.push(kt._id);
      }

      query.khachThue = { $in: linkedIds };
    } else if (accessibleToaNhaIds !== null) {
      // Logic dành cho Admin/Chủ nhà/Nhân viên
      const phongs = await connectToDatabase().then((db) => db.model('Phong').find({ toaNha: { $in: accessibleToaNhaIds } }).select('_id'));
      const phongIds = phongs.map((p: any) => p._id);

      if (phongIds.length === 0) {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }

      query.phong = { $in: phongIds };
    }

    const skip = (page - 1) * limit;

    const hoaDons = await HoaDon.find(query)
      .populate('hopDong', 'maHopDong')
      .populate('phong', 'maPhong')
      .sort({ nam: -1, thang: -1 })
      .skip(skip)
      .limit(limit);

    // Chuẩn bị models cho KhachThue
    const KhachThueModel = (await import('@/models/KhachThue')).default;
    const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');

    // Xử lý dữ liệu cũ không có chỉ số điện nước và lấy thông tin khách thuê
    const processedHoaDons = await Promise.all(hoaDons.map(async (hoaDon) => {
      const hoaDonObj = hoaDon.toObject();

      // Map thông tin khách thuê
      if (hoaDonObj.khachThue) {
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
        (hoaDonObj as any).khachThue = ktInfo || { _id: hoaDonObj.khachThue, hoTen: 'N/A' };
      }

      // Nếu không có chỉ số điện nước, tạo giá trị mặc định
      if (hoaDonObj.chiSoDienBanDau === undefined) {
        hoaDonObj.chiSoDienBanDau = 0;
      }
      if (hoaDonObj.chiSoDienCuoiKy === undefined) {
        hoaDonObj.chiSoDienCuoiKy = hoaDonObj.chiSoDienBanDau;
      }
      if (hoaDonObj.chiSoNuocBanDau === undefined) {
        hoaDonObj.chiSoNuocBanDau = 0;
      }
      if (hoaDonObj.chiSoNuocCuoiKy === undefined) {
        hoaDonObj.chiSoNuocCuoiKy = hoaDonObj.chiSoNuocBanDau;
      }

      return hoaDonObj;
    }));

    const total = await HoaDon.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: processedHoaDons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching hoa don:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Tạo hóa đơn mới
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const {
      maHoaDon,
      hopDong,
      thang,
      nam,
      tienPhong,
      chiSoDienBanDau,
      chiSoDienCuoiKy,
      chiSoNuocBanDau,
      chiSoNuocCuoiKy,
      phiDichVu,
      ghiChu,
      daThanhToan,
      trangThai,
      hanThanhToan
    } = body;

    // Validate required fields
    if (!hopDong) {
      return NextResponse.json(
        { message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Kiểm tra hợp đồng tồn tại
    const hopDongData = await HopDong.findById(hopDong)
      .populate('phong')
      .populate('khachThueId');

    if (!hopDongData) {
      return NextResponse.json(
        { message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập tòa nhà
    const toaNhaId = (hopDongData.phong as any).toaNha || hopDongData.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền tạo hóa đơn cho tòa nhà này' },
        { status: 403 }
      );
    }

    // Tạo mã hóa đơn (sử dụng mã từ frontend hoặc tự sinh)
    let finalMaHoaDon = maHoaDon;
    
    if (!finalMaHoaDon || finalMaHoaDon.trim() === '') {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      finalMaHoaDon = `HD${year}${month}${day}${randomNum}`;
    }

    // Kiểm tra mã hóa đơn đã tồn tại chưa
    const existingHoaDon = await HoaDon.findOne({ maHoaDon: finalMaHoaDon });
    if (existingHoaDon) {
      // Nếu mã từ frontend bị trùng, tự sinh mã mới
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      finalMaHoaDon = `HD${year}${month}${day}${randomNum}`;
    }

    let hoaDonData: Record<string, unknown> = {
      maHoaDon: finalMaHoaDon,
      hopDong: hopDong,
      phong: hopDongData.phong,
      khachThue: hopDongData.nguoiDaiDien,
      ghiChu
    };

    // Hóa đơn hàng tháng
    if (!thang || !nam || tienPhong === undefined) {
      return NextResponse.json(
        { message: 'Thiếu thông tin cho hóa đơn hàng tháng' },
        { status: 400 }
      );
    }

    // Kiểm tra hóa đơn tháng này đã tồn tại chưa
    const existingMonthlyHoaDon = await HoaDon.findOne({
      hopDong: hopDong,
      thang,
      nam
    });

    if (existingMonthlyHoaDon) {
      return NextResponse.json(
        { message: `Hóa đơn tháng ${thang}/${nam} đã tồn tại` },
        { status: 400 }
      );
    }

    // Tự động tính chỉ số điện nước
    let chiSoDienBanDauValue = chiSoDienBanDau;
    let chiSoDienCuoiKyValue = chiSoDienCuoiKy;
    let chiSoNuocBanDauValue = chiSoNuocBanDau;
    let chiSoNuocCuoiKyValue = chiSoNuocCuoiKy;

    // Tìm hóa đơn gần nhất để lấy chỉ số cuối kỳ
    const lastHoaDon = await HoaDon.findOne({
      hopDong: hopDong,
      $or: [
        { nam: { $lt: nam } },
        { nam: nam, thang: { $lt: thang } }
      ]
    }).sort({ nam: -1, thang: -1 });

    if (lastHoaDon) {
      // Hóa đơn tiếp theo: lấy chỉ số cuối kỳ từ hóa đơn trước
      chiSoDienBanDauValue = lastHoaDon.chiSoDienCuoiKy;
      chiSoNuocBanDauValue = lastHoaDon.chiSoNuocCuoiKy;
    } else {
      // Hóa đơn đầu tiên: lấy chỉ số ban đầu từ hợp đồng
      chiSoDienBanDauValue = hopDongData.chiSoDienBanDau;
      chiSoNuocBanDauValue = hopDongData.chiSoNuocBanDau;
    }

    // Nếu không có chỉ số cuối kỳ từ form, sử dụng chỉ số ban đầu
    if (!chiSoDienCuoiKyValue) {
      chiSoDienCuoiKyValue = chiSoDienBanDauValue;
    }
    if (!chiSoNuocCuoiKyValue) {
      chiSoNuocCuoiKyValue = chiSoNuocBanDauValue;
    }

    // Tính số điện nước
    const soDien = chiSoDienCuoiKyValue - chiSoDienBanDauValue;
    const soNuoc = chiSoNuocCuoiKyValue - chiSoNuocBanDauValue;

    // Tính tiền điện nước
    const tienDienTinh = soDien * hopDongData.giaDien;
    const tienNuocTinh = soNuoc * hopDongData.giaNuoc;

    const tongTien = tienPhong + tienDienTinh + tienNuocTinh + (phiDichVu?.reduce((sum: number, phi: PhiDichVu) => sum + phi.gia, 0) || 0);

    const conLaiValue = tongTien - (daThanhToan || 0);
    let trangThaiValue = 'chuaThanhToan';
    if (conLaiValue <= 0) {
      trangThaiValue = 'daThanhToan';
    } else if ((daThanhToan || 0) > 0) {
      trangThaiValue = 'daThanhToanMotPhan';
    }

    // Kiểm tra quá hạn
    const finalHanThanhToan = hanThanhToan ? new Date(hanThanhToan) : new Date(nam, thang - 1, hopDongData.ngayThanhToan);
    if (finalHanThanhToan < new Date() && conLaiValue > 0) {
      trangThaiValue = 'quaHan';
    }

    hoaDonData = {
      ...hoaDonData,
      thang,
      nam,
      tienPhong,
      tienDien: tienDienTinh,
      soDien,
      chiSoDienBanDau: chiSoDienBanDauValue,
      chiSoDienCuoiKy: chiSoDienCuoiKyValue,
      tienNuoc: tienNuocTinh,
      soNuoc,
      chiSoNuocBanDau: chiSoNuocBanDauValue,
      chiSoNuocCuoiKy: chiSoNuocCuoiKyValue,
      phiDichVu: phiDichVu || [],
      tongTien,
      daThanhToan: daThanhToan || 0,
      conLai: conLaiValue,
      trangThai: trangThaiValue,
      hanThanhToan: finalHanThanhToan
    };

    const hoaDon = new HoaDon(hoaDonData);
    await hoaDon.save();

    // Tự động tạo Link thanh toán VietQR tĩnh (qua vietqr.io)
    let checkoutUrl = '';
    if (hoaDon.conLai > 0) {
      try {
        let chuNhaId = session!.user!.id;
        const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
        
        // Nếu người tạo là nhân viên, lấy tài khoản ngân hàng của chủ nhà quản lý
        if (session!.user!.role === 'nhanVien') {
          const staff = await NguoiDungModel.findById(session!.user!.id);
          if (staff && staff.nguoiQuanLy) {
            chuNhaId = staff.nguoiQuanLy;
          }
        }
        
        const chuNha = await NguoiDungModel.findById(chuNhaId);
        
        if (chuNha && chuNha.thongTinThanhToan && chuNha.thongTinThanhToan.nganHang && chuNha.thongTinThanhToan.soTaiKhoan) {
          const bank = chuNha.thongTinThanhToan.nganHang.trim();
          const account = chuNha.thongTinThanhToan.soTaiKhoan.trim();
          const name = encodeURIComponent((chuNha.thongTinThanhToan.chuTaiKhoan || '').trim());
          const amount = hoaDon.conLai;
          const descriptionText = `TT PHONG ${hoaDon.maHoaDon.slice(-10)}`;
          const description = encodeURIComponent(descriptionText);
          
          // Mã QR tĩnh chuẩn VietQR quốc gia (hiển thị trực tiếp ảnh)
          let qrUrl = `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${amount}&addInfo=${description}`;
          if (name) {
            qrUrl += `&accountName=${name}`;
          }
          
          checkoutUrl = qrUrl;
          hoaDon.checkoutUrl = checkoutUrl;
          await hoaDon.save();
        }
      } catch (e) {
        console.error('Lỗi tự động tạo mã VietQR khi tạo hóa đơn:', e);
      }
    }

    // Populate để trả về dữ liệu đầy đủ (bao gồm polymorphic khachThue)
    const hoaDonObj = hoaDon.toObject();
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

    const finalHoaDon = {
      ...hoaDonObj,
      khachThue: ktInfo || { _id: hoaDonObj.khachThue, hoTen: 'N/A' }
    };

    return NextResponse.json({
      success: true,
      data: finalHoaDon,
      message: 'Tạo hóa đơn thành công'
    });
  } catch (error) {
    console.error('Error creating hoa don:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Cập nhật hóa đơn
export async function PUT(request: NextRequest) {
  try {
    console.log('PUT request received for hoa-don');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('Unauthorized request');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    console.log('Database connected');

    const body = await request.json();
    console.log('Request body:', body);
    const {
      id,
      maHoaDon,
      hopDong,
      thang,
      nam,
      tienPhong,
      chiSoDienBanDau,
      chiSoDienCuoiKy,
      chiSoNuocBanDau,
      chiSoNuocCuoiKy,
      phiDichVu,
      daThanhToan,
      trangThai,
      hanThanhToan,
      ghiChu
    } = body;

    // Validate required fields
    if (!id) {
      console.log('Missing ID');
      return NextResponse.json(
        { message: 'Thiếu ID hóa đơn' },
        { status: 400 }
      );
    }

    // Kiểm tra hóa đơn tồn tại
    console.log('Looking for hoa don with ID:', id);
    const existingHoaDon = await HoaDon.findById(id).populate('phong');
    if (!existingHoaDon) {
      console.log('Hoa don not found');
      return NextResponse.json(
        { message: 'Hóa đơn không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập tòa nhà
    const toaNhaId = (existingHoaDon.phong as any).toaNha || existingHoaDon.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền chỉnh sửa hóa đơn của tòa nhà này' },
        { status: 403 }
      );
    }

    // Kiểm tra hợp đồng tồn tại
    console.log('Looking for hop dong with ID:', hopDong);
    const hopDongData = await HopDong.findById(hopDong);
    if (!hopDongData) {
      console.log('Hop dong not found');
      return NextResponse.json(
        { message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Tính số điện nước an toàn
    const soDien = (chiSoDienCuoiKy || 0) - (chiSoDienBanDau || 0);
    const soNuoc = (chiSoNuocCuoiKy || 0) - (chiSoNuocBanDau || 0);

    // Tính tiền điện nước
    const tienDienTinh = Math.max(0, soDien) * (hopDongData.giaDien || 0);
    const tienNuocTinh = Math.max(0, soNuoc) * (hopDongData.giaNuoc || 0);

    const tienDichVuVal = (phiDichVu?.reduce((sum: number, phi: PhiDichVu) => sum + phi.gia, 0) || 0);
    const tongTien = (tienPhong || 0) + tienDienTinh + tienNuocTinh + tienDichVuVal;
    const conLai = tongTien - (daThanhToan || 0);

    // Tính trạng thái server-side
    let trangThaiValue = 'chuaThanhToan';
    if (conLai <= 0) {
      trangThaiValue = 'daThanhToan';
    } else if ((daThanhToan || 0) > 0) {
      trangThaiValue = 'daThanhToanMotPhan';
    }

    const finalHanThanhToan = hanThanhToan ? new Date(hanThanhToan) : existingHoaDon.hanThanhToan;
    if (finalHanThanhToan < new Date() && conLai > 0) {
      trangThaiValue = 'quaHan';
    }

    // Cập nhật hóa đơn
    const updatedHoaDon = await HoaDon.findByIdAndUpdate(
      id,
      {
        maHoaDon,
        hopDong,
        thang,
        nam,
        tienPhong,
        tienDien: tienDienTinh,
        soDien: Math.max(0, soDien),
        chiSoDienBanDau: chiSoDienBanDau || 0,
        chiSoDienCuoiKy: chiSoDienCuoiKy || 0,
        tienNuoc: tienNuocTinh,
        soNuoc: Math.max(0, soNuoc),
        chiSoNuocBanDau: chiSoNuocBanDau || 0,
        chiSoNuocCuoiKy: chiSoNuocCuoiKy || 0,
        phiDichVu: phiDichVu || [],
        tongTien,
        daThanhToan: daThanhToan || 0,
        conLai,
        trangThai: trangThaiValue,
        hanThanhToan: finalHanThanhToan,
        ghiChu
      },
      { new: true }
    );

    // Populate để trả về dữ liệu đầy đủ (bao gồm polymorphic khachThue)
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

    const finalUpdatedHoaDon = {
      ...hoaDonObj,
      khachThue: ktInfo || { _id: hoaDonObj.khachThue, hoTen: 'N/A' }
    };

    return NextResponse.json({
      success: true,
      data: finalUpdatedHoaDon,
      message: 'Cập nhật hóa đơn thành công'
    });
  } catch (error) {
    console.error('Error updating hoa don:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa hóa đơn
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'Thiếu ID hóa đơn' },
        { status: 400 }
      );
    }

    const existingHoaDon = await HoaDon.findById(id).populate('phong');
    if (!existingHoaDon) {
      return NextResponse.json(
        { message: 'Hóa đơn không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập tòa nhà
    const toaNhaId = (existingHoaDon.phong as any).toaNha || existingHoaDon.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa hóa đơn của tòa nhà này' },
        { status: 403 }
      );
    }

    await HoaDon.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Xóa hóa đơn thành công'
    });
  } catch (error) {
    console.error('Error deleting hoa don:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}