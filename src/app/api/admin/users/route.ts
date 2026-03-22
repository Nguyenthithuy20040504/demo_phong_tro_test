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
    
    const users = await NguoiDung.find(query, { password: 0, matKhau: 0 })
      .populate('nguoiQuanLy', 'ngayHetHan name ten')
      .populate('nguoiTao', 'name ten email role')
      .sort({ createdAt: -1 })
      .lean();
    
    // Auto-migrate: Nếu có user nào chưa có ngayHetHan, cập nhật luôn
    let needsUpdate = false;
    const updatedUsers = [];
    
    for (let user of users as any[]) {
      // Tính chất DB: Nhân viên LUÔN kế thừa ngày hết hạn của Chủ nhà nếu có Chủ nhà
      const roleStr = user.role || user.vaiTro;
      if (roleStr === 'nhanVien' && user.nguoiQuanLy && user.nguoiQuanLy.ngayHetHan) {
        user.ngayHetHan = user.nguoiQuanLy.ngayHetHan;
      }

      if (!user.ngayHetHan) {
        needsUpdate = true;
        const now = new Date();
        let expiryDate = null;
        
        const roleStr = user.role || user.vaiTro;
        
        if (roleStr === 'admin' || roleStr === 'khachThue') {
          expiryDate = new Date(2099, 11, 31);
        } else if (roleStr === 'chuNha') {
          // Lấy ngày tạo, nếu không có lấy hôm nay
          expiryDate = new Date(user.createdAt || user.ngayTao || now);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (roleStr === 'nhanVien') {
          if (user.nguoiQuanLy) {
             const chuNha = await NguoiDung.findById(user.nguoiQuanLy);
             expiryDate = chuNha?.ngayHetHan || new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          } else {
             expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          }
        } else {
          // Default for any other case
          expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }

        console.log(`Migrating user ${user.email} with role ${roleStr} to expiry ${expiryDate}`);
        
        await NguoiDung.collection.updateOne(
          { _id: user._id }, 
          { 
            $set: { 
              ngayHetHan: expiryDate,
              goiDichVu: user.goiDichVu || 'mienPhi'
            } 
          }
        );

        // Fetch the updated document raw to ensure we have the new fields
        const updated = await NguoiDung.findById(user._id, { password: 0, matKhau: 0 }).lean();
        updatedUsers.push(updated);
      } else {
        updatedUsers.push(user);
      }
    }

    return NextResponse.json(updatedUsers);
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

    if (phone && !/^[0-9]{10,11}$/.test(phone)) {
      return NextResponse.json({ message: 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số.' }, { status: 400 });
    }

    if (session.user.role === 'chuNha') {
      if (role !== 'nhanVien' && role !== 'khachThue') {
         return NextResponse.json({ message: 'Chủ nhà chỉ được tạo tài khoản Nhân Viên hoặc Khách Thuê' }, { status: 403 });
      }
    } else if (session.user.role === 'admin') {
      if (role !== 'chuNha' && role !== 'admin') {
         return NextResponse.json({ message: 'Quản trị viên chỉ được tạo tài khoản Chủ nhà hoặc Quản trị viên' }, { status: 403 });
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
      nguoiQuanLy: session.user.role === 'chuNha' ? session.user.id : null,
      nguoiTao: session.user.id
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
