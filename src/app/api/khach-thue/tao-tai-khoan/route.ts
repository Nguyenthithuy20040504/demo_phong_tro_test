import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import KhachThue from '@/models/KhachThue';
import { sendAccountConfirmationLinkEmail } from '@/lib/mail';
import crypto from 'crypto';

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
    
    // Kiểm tra khách thuê đã có tài khoản chưa (theo ID, SĐT hoặc CCCD)
    const existingAccount = await NguoiDung.findOne({
      $or: [
        { _id: khachThueId },
        { email: emailLower },
        { soDienThoai: khachThue.soDienThoai },
        { phone: khachThue.soDienThoai },
        { cccd: khachThue.cccd }
      ]
    });
    
    if (existingAccount) {
      // Nếu đã có tài khoản rồi, không cần tạo mới, trả về thông báo thành công luôn
      return NextResponse.json({ 
        success: true, 
        message: `Khách thuê này đã có tài khoản (email: ${existingAccount.email}). Không cần tạo mới, khách có thể dùng tài khoản hiện tại để đăng nhập.`,
        data: {
          userId: existingAccount._id,
          email: existingAccount.email,
        }
      }, { status: 200 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hanToken = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Tạo tài khoản NguoiDung 
    const newUser = new NguoiDung({
      _id: khachThueId,
      ten: khachThue.hoTen,
      name: khachThue.hoTen,
      email: emailLower,
      matKhau: matKhau,
      password: matKhau,
      soDienThoai: khachThue.soDienThoai,
      phone: khachThue.soDienThoai,
      vaiTro: 'khachThue',
      role: 'khachThue',
      trangThai: 'hoatDong',
      isActive: true,
      nguoiQuanLy: session.user.id,
      nguoiTao: session.user.id,
      daXacMinhEmail: false,
      maXacNhanEmail: token,
      hanMaXacNhanEmail: hanToken,
    });

    await newUser.save();

    const baseUrl = request.nextUrl.origin;
    const confirmLink = `${baseUrl}/api/auth/xac-nhan-tai-khoan?token=${token}&email=${encodeURIComponent(emailLower)}`;
    
    sendAccountConfirmationLinkEmail({
      email: emailLower,
      khachThueName: khachThue.hoTen,
      confirmLink: confirmLink
    }).catch(console.error);

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
