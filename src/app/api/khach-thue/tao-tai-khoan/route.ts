import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import KhachThue from '@/models/KhachThue';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'chuNha' && session.user.role !== 'chuTro' && session.user.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { khachThueId, email, matKhau } = await request.json();
    
    if (!khachThueId) {
      return NextResponse.json({ success: false, message: 'Thiếu ID khách thuê' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập email' }, { status: 400 });
    }
    if (!matKhau || matKhau.length < 6) {
      return NextResponse.json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    await dbConnect();

    // Tìm khách thuê
    const khachThue = await KhachThue.findById(khachThueId);
    if (!khachThue) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy khách thuê' }, { status: 404 });
    }

    // Kiểm tra email đã tồn tại chưa
    const emailLower = email.toLowerCase();
    const existingEmail = await NguoiDung.findOne({ email: emailLower });
    if (existingEmail) {
      return NextResponse.json({ 
        success: false, 
        message: `Email "${emailLower}" đã được sử dụng bởi tài khoản khác` 
      }, { status: 400 });
    }

    // Kiểm tra khách thuê đã có tài khoản chưa (qua SĐT)
    const existingAccount = await NguoiDung.findOne({
      vaiTro: 'khachThue',
      $or: [
        { soDienThoai: khachThue.soDienThoai },
        { phone: khachThue.soDienThoai },
      ]
    });
    if (existingAccount) {
      return NextResponse.json({ 
        success: false, 
        message: `Khách thuê này đã có tài khoản (email: ${existingAccount.email})` 
      }, { status: 400 });
    }

    // Kiểm tra SĐT đã bị dùng chưa (unique index)
    const phoneTaken = await NguoiDung.findOne({
      $or: [
        { soDienThoai: khachThue.soDienThoai },
        { phone: khachThue.soDienThoai }
      ]
    });

    // Tạo tài khoản NguoiDung 
    const newUser = new NguoiDung({
      ten: khachThue.hoTen,
      name: khachThue.hoTen,
      email: emailLower,
      matKhau: matKhau,
      password: matKhau,
      soDienThoai: phoneTaken ? `kt_${khachThue.soDienThoai}` : khachThue.soDienThoai,
      phone: phoneTaken ? `kt_${khachThue.soDienThoai}` : khachThue.soDienThoai,
      vaiTro: 'khachThue',
      role: 'khachThue',
      trangThai: 'hoatDong',
      isActive: true,
      nguoiQuanLy: session.user.id,
      nguoiTao: session.user.id,
    });

    await newUser.save();

    return NextResponse.json({
      success: true,
      message: `Đã tạo tài khoản cho ${khachThue.hoTen}`,
      data: {
        userId: newUser._id,
        email: newUser.email,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating tenant account:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email hoặc số điện thoại đã tồn tại trong hệ thống' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: 'Có lỗi xảy ra' }, { status: 500 });
  }
}
