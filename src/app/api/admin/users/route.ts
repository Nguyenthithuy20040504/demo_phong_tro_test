import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng tải lại trang' }, { status: 401 });
    }

    // Role check: Admin can access, ChuNha can access
    if (session.user.role !== 'admin' && session.user.role !== 'chuNha') {
      return NextResponse.json({ message: 'Bạn không có quyền xem danh sách tài khoản' }, { status: 403 });
    }

    await dbConnect();
    
    let query: any = {};
    if (session.user.role === 'chuNha') {
      // Ensure we query by the managed users only
      // Using mongoose.Types.ObjectId to ensure correct comparison
      const mongoose = require('mongoose');
      query.nguoiQuanLy = new mongoose.Types.ObjectId(session.user.id);
    }
    
    // Explicitly exclude any admins or other landlords even if the query might suggest otherwise
    // (though the nguoiQuanLy filter should handle this, it's a good safety measure)
    if (session.user.role === 'chuNha') {
      query.role = { $nin: ['admin', 'chuNha'] };
    }
    
    const users = await NguoiDung.find(query, { password: 0, matKhau: 0 }).sort({ createdAt: -1 });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống khi tải danh sách người dùng' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Admin can access, ChuNha can access
    if (session.user.role !== 'admin' && session.user.role !== 'chuNha') {
      return NextResponse.json({ message: 'Bạn không có quyền tạo tài khoản mới' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, phone, role } = body;

    // Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Vui lòng điền đầy đủ các thông tin: Họ tên, Email, Mật khẩu và Vai trò' }, { status: 400 });
    }

    if (session.user.role === 'chuNha') {
      if (role !== 'nhanVien' && role !== 'khachThue') {
         return NextResponse.json({ message: 'Chủ nhà chỉ được tạo tài khoản Nhân Viên hoặc Khách Thuê' }, { status: 403 });
      }
    }

    // Check if user already exists
    await dbConnect();
    const existingUser = await NguoiDung.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'Email này đã được sử dụng. Vui lòng nhập một Email khác!' }, { status: 400 });
    }

    // Create user (password will be hashed by the model's pre-save hook)
    const newUser = new NguoiDung({
      // Vietnamese fields
      ten: name,
      email,
      matKhau: password,
      soDienThoai: phone,
      vaiTro: role,
      trangThai: 'hoatDong',
      // English fields
      name,
      password: password,
      phone,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      nguoiQuanLy: session.user.role === 'chuNha' ? session.user.id : null
    });

    await newUser.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Không thể tạo được tài khoản lúc này, vui lòng thử lại sau' }, { status: 500 });
  }
}
