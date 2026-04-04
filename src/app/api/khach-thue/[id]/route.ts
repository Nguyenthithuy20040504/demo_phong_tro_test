import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import KhachThue from '@/models/KhachThue';
import HopDong from '@/models/HopDong';
import PhongModel from '@/models/Phong';
import NguoiDungModel from '@/models/NguoiDung';
import { z } from 'zod';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const khachThueSchema = z.object({
  hoTen: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  soDienThoai: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').optional(),
  cccd: z.string().regex(/^[0-9]{12}$/, 'CCCD phải có 12 chữ số'),
  ngaySinh: z.string().min(1, 'Ngày sinh là bắt buộc'),
  gioiTinh: z.enum(['nam', 'nu', 'khac']),
  queQuan: z.string().min(1, 'Quê quán là bắt buộc'),
  anhCCCD: z.object({
    matTruoc: z.string().optional(),
    matSau: z.string().optional(),
  }).optional(),
  ngheNghiep: z.string().optional(),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;

    const khachThue = await KhachThue.findById(id);

    if (!khachThue) {
      return NextResponse.json(
        { message: 'Khách thuê không tồn tại' },
        { status: 404 }
      );
    }

    // Lấy thông tin hợp đồng tương tự như API danh sách
    const tatCaHopDong = await HopDong.find({
      $or: [
        { khachThueId: { $in: [id, new mongoose.Types.ObjectId(id)] } },
        { nguoiDaiDien: { $in: [id, new mongoose.Types.ObjectId(id)] } }
      ]
    })
    .sort({ ngayTao: -1 })
    .populate('phong', 'maPhong toaNha')
    .populate({
      path: 'phong',
      populate: {
        path: 'toaNha',
        select: 'tenToaNha diaChi'
      }
    });

    const khachThueObj = khachThue.toObject();
    const hopDongHienTai = tatCaHopDong.find(h => h.trangThai === 'hoatDong');

    let chuNhaId = session.user.id;
    if (session.user.role === 'nhanVien') {
      const dbUser = await NguoiDungModel.findById(session.user.id).select('nguoiQuanLy');
      if (dbUser && dbUser.nguoiQuanLy) {
        chuNhaId = dbUser.nguoiQuanLy.toString();
      }
    }

    // Kiểm tra tài khoản ở NguoiDung (chỉ tính nếu do chủ nhà này quản lý)
    const userAccount = await NguoiDungModel.findOne({
      _id: id,
      nguoiQuanLy: new mongoose.Types.ObjectId(chuNhaId)
    }).select('+matKhau');
    
    const hasPassword = userAccount && (!!userAccount.matKhau || !!(userAccount as any).password);

    return NextResponse.json({
      success: true,
      data: {
        ...khachThueObj,
        ngayTao: khachThueObj.ngayTao || khachThueObj.createdAt || khachThue.createdAt,
        ngayCapNhat: khachThueObj.ngayCapNhat || khachThueObj.updatedAt || khachThue.updatedAt,
        matKhau: hasPassword ? '******' : undefined,
        hopDongHienTai: hopDongHienTai || null,
        tatCaHopDong: tatCaHopDong || [],
      },
    });

  } catch (error) {
    console.error('Error fetching khach thue:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = khachThueSchema.parse(body);

    await dbConnect();
    const { id } = await params;

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    // 1. Check and Update/Create KhachThue (Profile) to get nguoiQuanLy
    let khachThue = await KhachThue.findById(id).session(dbSession);
    let nguoiQuanLyId = session.user.id;

    try {
      if (khachThue) {
        nguoiQuanLyId = khachThue.nguoiQuanLy.toString();
      } else {
        const user = await NguoiDungModel.findById(id).session(dbSession);
        if (user?.nguoiQuanLy) {
          nguoiQuanLyId = user.nguoiQuanLy.toString();
        } else if (session.user.role === 'nhanVien') {
          // Find staff's manager
          const nhanVien = await NguoiDungModel.findById(session.user.id).select('nguoiQuanLy').session(dbSession);
          if (nhanVien?.nguoiQuanLy) {
            nguoiQuanLyId = nhanVien.nguoiQuanLy.toString();
          }
        }
      }

      // Check if phone or CCCD already exists (excluding current record) FOR THIS LANDLORD
      const existingKhachThue = await KhachThue.findOne({
        _id: { $ne: id },
        nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId),
        $or: [
          { soDienThoai: validatedData.soDienThoai },
          { cccd: validatedData.cccd }
        ]
      }).session(dbSession);

      if (existingKhachThue) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return NextResponse.json(
          { message: 'Số điện thoại hoặc CCCD này đã được bạn sử dụng cho một khách thuê khác.' },
          { status: 400 }
        );
      }

      // Kiểm tra trùng lặp Email ở NguoiDung collection (Tài khoản truy cập)
      if (validatedData.email) {
        const existingEmailUser = await NguoiDungModel.findOne({
          email: validatedData.email.toLowerCase(),
          _id: { $ne: id }
        }).session(dbSession);

        if (existingEmailUser) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          return NextResponse.json(
            { message: 'Email này đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.' },
            { status: 400 }
          );
        }
      }

      // Prepare update data
      const updateData: any = {
        ...validatedData,
        ngaySinh: new Date(validatedData.ngaySinh),
        anhCCCD: validatedData.anhCCCD || { matTruoc: '', matSau: '' },
      };

      // Cập nhật NguoiDung (Account) info (Gồm: name, phone, email, username)
      const NguoiDung = NguoiDungModel;
      
      let passwordUpdate = {};
      if (validatedData.matKhau) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(validatedData.matKhau, salt);
        passwordUpdate = { matKhau: hashedPassword, password: hashedPassword };
      }

      await NguoiDung.findByIdAndUpdate(id, {
          ten: validatedData.hoTen,
          name: validatedData.hoTen, // Sync English field
          soDienThoai: validatedData.soDienThoai,
          phone: validatedData.soDienThoai, // Sync English field
          email: validatedData.email,
          // Note: Schema currently has email as primary credential. Assumed equivalent to username.
          ...passwordUpdate
      }, { session: dbSession, new: true });

      // Cập nhật hoặc tạo mới KhachThue
      if (!khachThue) {
        // IF NOT FOUND in KhachThue, create one using same ID
        const user = await NguoiDung.findById(id).session(dbSession);
        khachThue = new KhachThue({
          _id: id,
          ...updateData,
          trangThai: 'chuaThue',
          nguoiQuanLy: user?.nguoiQuanLy || session.user.id
        });
      } else {
        // IF FOUND, update
        Object.assign(khachThue, updateData);
      }

      // Handle password change for KhachThue
      if (validatedData.matKhau) {
        khachThue.matKhau = validatedData.matKhau; // Will be hashed by its own middleware
      }

      await khachThue.save({ session: dbSession });

      // Commit transaction success
      await dbSession.commitTransaction();
      dbSession.endSession();
    } catch (transactionError) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw transactionError; // Ném ra ngoài để block catch to nhận diện lỗi
    }

    // Lấy đầy đủ thông tin sau khi lưu
    const tatCaHopDong = await HopDong.find({
      khachThueId: { $in: [id, new mongoose.Types.ObjectId(id)] }
    })
    .sort({ ngayTao: -1 })
    .populate('phong', 'maPhong toaNha')
    .populate({
      path: 'phong',
      populate: {
        path: 'toaNha',
        select: 'tenToaNha diaChi'
      }
    });

    const khachThueObj = khachThue.toObject();
    const hopDongHienTai = tatCaHopDong.find(h => h.trangThai === 'hoatDong');

    // Kiểm tra tài khoản ở NguoiDung (chỉ tính nếu do chủ nhà này quản lý)
    const userAccount = await NguoiDungModel.findOne({
      _id: id,
      nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId)
    }).select('+matKhau');
    
    const hasPassword = userAccount && (!!userAccount.matKhau || !!(userAccount as any).password);

    return NextResponse.json({
      success: true,
      data: {
        ...khachThueObj,
        ngayTao: khachThueObj.ngayTao || khachThueObj.createdAt || khachThue.createdAt,
        ngayCapNhat: khachThueObj.ngayCapNhat || khachThueObj.updatedAt || khachThue.updatedAt,
        matKhau: hasPassword ? '******' : undefined,
        hopDongHienTai: hopDongHienTai || null,
        tatCaHopDong: tatCaHopDong || [],
      },
      message: 'Hồ sơ đã được cập nhật thành công. Vui lòng nhắc khách thuê sử dụng Email mới để đăng nhập từ lần sau!',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating khach thue:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;
    const NguoiDung = NguoiDungModel;
    const Phong = PhongModel;

    // Tìm khách thuê trong KhachThue hoặc NguoiDung (check cả vaiTro và role)
    const khachThue = await KhachThue.findById(id);
    const nguoiDungKT = await NguoiDung.findOne({
      _id: id,
      $or: [{ vaiTro: 'khachThue' }, { role: 'khachThue' }]
    });
    
    // Nếu KhachThue không có, thử tìm NguoiDung theo SĐT/email (trường hợp orphaned)
    let nguoiDungByPhone = null;
    if (!khachThue && !nguoiDungKT) {
      // Thử tìm bằng ID đơn giản (không filter role) — có thể là orphaned record
      nguoiDungByPhone = await NguoiDung.findById(id);
    }
    
    if (!khachThue && !nguoiDungKT && !nguoiDungByPhone) {
      return NextResponse.json(
        { message: 'Khách thuê không tồn tại' },
        { status: 404 }
      );
    }

    // Lấy thông tin để tìm liên kết
    const source = khachThue || nguoiDungKT || nguoiDungByPhone;
    const tenantPhone = khachThue?.soDienThoai || nguoiDungKT?.soDienThoai || nguoiDungKT?.phone || nguoiDungByPhone?.soDienThoai || nguoiDungByPhone?.phone;
    const tenantEmail = khachThue?.email || nguoiDungKT?.email || nguoiDungByPhone?.email;
    const tenantName = khachThue?.hoTen || nguoiDungKT?.ten || nguoiDungKT?.name || nguoiDungByPhone?.ten || nguoiDungByPhone?.name;

    // 1. Tìm tất cả hợp đồng hoạt động/chờ duyệt của khách thuê
    const activeContracts = await HopDong.find({
      $or: [
        { khachThueId: { $in: [id, new mongoose.Types.ObjectId(id)] } },
        { nguoiDaiDien: { $in: [id, new mongoose.Types.ObjectId(id)] } }
      ],
      trangThai: { $in: ['hoatDong', 'choDuyet'] }
    });

    // 2. Kết thúc hợp đồng và reset phòng về trạng thái trống
    for (const hopDong of activeContracts) {
      hopDong.trangThai = 'daKetThuc';
      hopDong.ngayKetThuc = new Date();
      await hopDong.save();

      if (hopDong.phong) {
        await Phong.findByIdAndUpdate(hopDong.phong, {
          trangThai: 'trong',
          nguoiThue: null,
        });
      }
    }

    // 3. Xóa tài khoản NguoiDung liên kết (match cả vaiTro và role)
    const deleteOrConditions: any[] = [{ _id: id }];
    if (tenantPhone) {
      deleteOrConditions.push(
        { vaiTro: 'khachThue', soDienThoai: tenantPhone },
        { vaiTro: 'khachThue', phone: tenantPhone },
        { role: 'khachThue', soDienThoai: tenantPhone },
        { role: 'khachThue', phone: tenantPhone }
      );
    }
    if (tenantEmail) {
      deleteOrConditions.push(
        { vaiTro: 'khachThue', email: tenantEmail.toLowerCase() },
        { role: 'khachThue', email: tenantEmail.toLowerCase() }
      );
    }
    await NguoiDung.deleteMany({ $or: deleteOrConditions });

    // 4. Xóa khách thuê từ KhachThue collection (nếu có)
    if (khachThue) {
      await KhachThue.findByIdAndDelete(id);
    }

    const roomCount = activeContracts.length;
    return NextResponse.json({
      success: true,
      message: `Đã xóa khách thuê ${tenantName}${roomCount > 0 ? `, kết thúc ${roomCount} hợp đồng và reset phòng` : ''}`,
    });

  } catch (error) {
    console.error('Error deleting khach thue:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
