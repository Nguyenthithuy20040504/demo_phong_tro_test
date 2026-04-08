import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let users;
    
    if (session.user.role === 'admin' && type === 'chuNha') {
      // Aggregation for Landlords with Building/Room counts
      users = await NguoiDung.aggregate([
        { $match: { vaiTro: 'chuNha' } },
        {
          $lookup: {
            from: 'toanhas', // Mongoose collection name is usually lowercased + pluralized
            localField: '_id',
            foreignField: 'chuSoHuu',
            as: 'buildings'
          }
        },
        {
          $addFields: {
            totalBuildings: { $size: '$buildings' },
            totalRooms: { $sum: '$buildings.tongSoPhong' }
          }
        },
        {
          $project: {
            matKhau: 0,
            password: 0,
            buildings: 0
          }
        },
        { $sort: { createdAt: -1 } }
      ]);
    } else {
      let query: any = {};
      if (session.user.role === 'chuNha') {
        const mongoose = require('mongoose');
        query.nguoiQuanLy = new mongoose.Types.ObjectId(session.user.id);
        query.role = { $nin: ['admin', 'chuNha'] };
      }
      
      users = await NguoiDung.find(query, { password: 0, matKhau: 0 })
        .populate('nguoiQuanLy', 'ngayHetHan name ten')
        .populate('nguoiTao', 'name ten email role')
        .sort({ createdAt: -1 })
        .lean();
    }
    
    const updatedUsers = [];
    
    for (let user of users as any[]) {
      const roleStr = user.role || user.vaiTro;
      if (roleStr === 'nhanVien' && user.nguoiQuanLy && user.nguoiQuanLy.ngayHetHan) {
        user.ngayHetHan = user.nguoiQuanLy.ngayHetHan;
      }

      if (!user.ngayHetHan) {
        const now = new Date();
        let expiryDate = null;
        
        if (roleStr === 'admin' || roleStr === 'khachThue') {
          expiryDate = new Date(2099, 11, 31);
        } else if (roleStr === 'chuNha') {
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
          expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }
        
        await NguoiDung.collection.updateOne(
          { _id: user._id }, 
          { 
            $set: { 
              ngayHetHan: expiryDate,
              goiDichVu: user.goiDichVu || 'mienPhi'
            } 
          }
        );
        user.ngayHetHan = expiryDate;
        user.goiDichVu = user.goiDichVu || 'mienPhi';
      }
      updatedUsers.push(user);
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
    const { 
      name, email, password, phone, role, tenantId,
      cccd, ngaySinh, gioiTinh, queQuan, ngheNghiep, anhCCCD
    } = body;

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
    const mongoose = require('mongoose');
    const newUser = new NguoiDung({
      ...(tenantId ? { _id: new mongoose.Types.ObjectId(tenantId) } : {}),
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
      nguoiTao: session.user.id,
      // Profile fields
      cccd: cccd || null,
      ngaySinh: ngaySinh ? new Date(ngaySinh) : null,
      gioiTinh: gioiTinh || null,
      queQuan: queQuan || null,
      ngheNghiep: ngheNghiep || null,
      anhCCCD: anhCCCD || { matTruoc: '', matSau: '' }
    });

    await newUser.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ message: messages.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Email này đã tồn tại trong hệ thống' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Không thể tạo được tài khoản lúc này, vui lòng thử lại sau' }, { status: 500 });
  }
}
