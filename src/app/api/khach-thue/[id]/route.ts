import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import KhachThue from '@/models/KhachThue';
import HopDong from '@/models/HopDong';
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

    // Kiểm tra tài khoản ở NguoiDung
    const userAccount = await mongoose.model('NguoiDung').findById(id).select('+matKhau');
    const hasPassword = !!khachThueObj.matKhau || (userAccount && !!userAccount.matKhau);

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

    // Check if phone or CCCD already exists (excluding current record)
    const existingKhachThue = await KhachThue.findOne({
      _id: { $ne: id },
      $or: [
        { soDienThoai: validatedData.soDienThoai },
        { cccd: validatedData.cccd }
      ]
    });

    if (existingKhachThue) {
      return NextResponse.json(
        { message: 'Số điện thoại hoặc CCCD đã được sử dụng' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      ngaySinh: new Date(validatedData.ngaySinh),
      anhCCCD: validatedData.anhCCCD || { matTruoc: '', matSau: '' },
    };

    // 1. Update NguoiDung (Account) info
    const NguoiDung = mongoose.model('NguoiDung');
    await NguoiDung.findByIdAndUpdate(id, {
        ten: validatedData.hoTen,
        soDienThoai: validatedData.soDienThoai,
        email: validatedData.email,
        // matKhau will be handled below if provided
    });

    // 2. Check and Update/Create KhachThue (Profile)
    let khachThue = await KhachThue.findById(id);
    
    if (!khachThue) {
      // IF NOT FOUND in KhachThue, create one using same ID
      const user = await NguoiDung.findById(id);
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

    // Handle password change for both models
    if (validatedData.matKhau) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.matKhau, salt);
      
      // Update NguoiDung password
      await NguoiDung.findByIdAndUpdate(id, { matKhau: hashedPassword });
      
      // Update KhachThue password
      khachThue.matKhau = validatedData.matKhau; // Will be hashed by its own middleware
    }

    await khachThue.save();

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

    // Kiểm tra tài khoản ở NguoiDung
    const userAccount = await mongoose.model('NguoiDung').findById(id).select('+matKhau');
    const hasPassword = !!khachThueObj.matKhau || (userAccount && !!userAccount.matKhau);

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
      message: 'Hồ sơ khách thuê đã được cập nhật thành công',
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
    const NguoiDung = mongoose.model('NguoiDung');
    const Phong = mongoose.model('Phong');

    // Tìm khách thuê trong KhachThue hoặc NguoiDung
    const khachThue = await KhachThue.findById(id);
    const nguoiDungKT = await NguoiDung.findOne({ _id: id, vaiTro: 'khachThue' });
    
    if (!khachThue && !nguoiDungKT) {
      return NextResponse.json(
        { message: 'Khách thuê không tồn tại' },
        { status: 404 }
      );
    }

    // Lấy thông tin để tìm liên kết
    const tenantPhone = khachThue?.soDienThoai || nguoiDungKT?.soDienThoai || nguoiDungKT?.phone;
    const tenantEmail = khachThue?.email || nguoiDungKT?.email;
    const tenantName = khachThue?.hoTen || nguoiDungKT?.ten || nguoiDungKT?.name;

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

    // 3. Xóa tài khoản NguoiDung liên kết
    const deleteOrConditions: any[] = [{ _id: id }];
    if (tenantPhone) {
      deleteOrConditions.push(
        { vaiTro: 'khachThue', soDienThoai: tenantPhone },
        { vaiTro: 'khachThue', phone: tenantPhone }
      );
    }
    if (tenantEmail) {
      deleteOrConditions.push({ vaiTro: 'khachThue', email: tenantEmail.toLowerCase() });
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
