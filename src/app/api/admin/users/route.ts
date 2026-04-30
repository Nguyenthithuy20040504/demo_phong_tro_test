import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { sendAccountConfirmationLinkEmail } from '@/lib/mail';
import crypto from 'crypto';

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
            from: 'toanhas',
            localField: '_id',
            foreignField: 'chuSoHuu',
            as: 'buildings'
          }
        },
        {
          $addFields: {
            totalBuildings: { $size: '$buildings' },
            _buildingIds: { $map: { input: '$buildings', as: 'b', in: '$$b._id' } }
          }
        },
        {
          $lookup: {
            from: 'phongs',
            localField: '_buildingIds',
            foreignField: 'toaNha',
            as: 'rooms'
          }
        },
        {
          $addFields: {
            totalRooms: { $size: '$rooms' }
          }
        },
        {
          $project: {
            matKhau: 0,
            password: 0,
            buildings: 0,
            _buildingIds: 0,
            rooms: 0
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

      // Nếu là chủ nhà, lấy thêm cả KhachThue đã có tài khoản
      if (session.user.role === 'chuNha') {
        const KhachThue = require('@/models/KhachThue').default;
        const tenantsWithAccounts = await KhachThue.find({
          nguoiQuanLy: session.user.id,
          tenDangNhap: { $exists: true, $ne: '' }
        }).lean();

        // Chuyển đổi dữ liệu KhachThue sang format User
        const tenantUsers = tenantsWithAccounts.map((kt: any) => ({
          _id: kt._id.toString(),
          name: kt.hoTen,
          ten: kt.hoTen,
          email: kt.email || '',
          phone: kt.soDienThoai,
          soDienThoai: kt.soDienThoai,
          username: kt.tenDangNhap,
          tenDangNhap: kt.tenDangNhap,
          role: 'khachThue',
          vaiTro: 'khachThue',
          avatar: kt.avatar || kt.anhDaiDien,
          isActive: true,
          daXacMinhEmail: kt.daXacMinhEmail,
          createdAt: kt.createdAt,
          lastLogin: kt.lastLogin,
          ngayHetHan: new Date(2099, 11, 31),
          nguoiTao: session.user.id
        }));

        users = [...(users as any[]), ...tenantUsers].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      }
    }
    
    const updatedUsers = [];
    
    for (let user of users as any[]) {
      const roleStr = user.role || user.vaiTro;
      // ... (giữ nguyên logic cập nhật ngayHetHan bên dưới)
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
      name, email, username, password, phone, role, tenantId,
      cccd, ngaySinh, gioiTinh, queQuan, ngheNghiep, anhCCCD
    } = body;

    // Validation
    if (!name || (!email && role !== 'khachThue') || !username || !password || !role) {
      return NextResponse.json({ message: 'Vui lòng điền đầy đủ các thông tin: Họ tên, Tên đăng nhập, Mật khẩu và Vai trò' }, { status: 400 });
    }

    if (phone && !/^[0-9]{10,11}$/.test(phone)) {
      return NextResponse.json({ message: 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số.' }, { status: 400 });
    }

    await dbConnect();

    // Check if username exists in either NguoiDung or KhachThue
    const KhachThue = (await import('@/models/KhachThue')).default;
    const existingUsernameInNguoiDung = await NguoiDung.findOne({ username });
    const existingUsernameInKhachThue = await KhachThue.findOne({ tenDangNhap: username });
    
    if (existingUsernameInNguoiDung || existingUsernameInKhachThue) {
      return NextResponse.json({ message: 'Tên đăng nhập này đã tồn tại trong hệ thống' }, { status: 400 });
    }

    if (email) {
      const existingEmail = await NguoiDung.findOne({ email });
      const existingEmailInKhachThue = await KhachThue.findOne({ email, nguoiQuanLy: session.user.id });
      if (existingEmail || existingEmailInKhachThue) {
        // For tenants, email uniqueness is only within landlord scope in KhachThue model, 
        // but for NguoiDung it's global.
        if (existingEmail) {
            return NextResponse.json({ message: 'Email này đã được sử dụng bởi một tài khoản hệ thống.' }, { status: 400 });
        }
      }
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

    let newUser;
    let verificationRequired = role === 'khachThue' || role === 'chuNha';
    let verifyToken = verificationRequired ? crypto.randomBytes(32).toString('hex') : undefined;
    let otpExpiry = verificationRequired ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

    if (role === 'khachThue') {
      // Handle Tenant Account
      if (tenantId) {
        newUser = await KhachThue.findById(tenantId);
        if (!newUser) return NextResponse.json({ message: 'Không tìm thấy hồ sơ khách thuê để liên kết' }, { status: 404 });
        
        newUser.tenDangNhap = username;
        newUser.matKhau = password;
        newUser.daXacMinhEmail = false;
        newUser.maXacNhanEmail = verifyToken;
        newUser.hanMaXacNhanEmail = otpExpiry;
        if (email) newUser.email = email;
        await newUser.save();
      } else {
        // Create brand new KhachThue record
        newUser = new KhachThue({
          hoTen: name,
          tenDangNhap: username,
          matKhau: password,
          soDienThoai: phone,
          email: email,
          cccd: cccd || '000000000000', // Default if not provided
          ngaySinh: ngaySinh ? new Date(ngaySinh) : new Date(),
          gioiTinh: gioiTinh || 'khac',
          queQuan: queQuan || 'Chưa cập nhật',
          nguoiQuanLy: session.user.id,
          daXacMinhEmail: false,
          maXacNhanEmail: verifyToken,
          hanMaXacNhanEmail: otpExpiry,
          trangThai: 'chuaThue'
        });
        await newUser.save();
      }
    } else {
      // Handle NguoiDung-based roles (Admin, ChuNha, NhanVien)
      newUser = new NguoiDung({
        ten: name,
        email: email,
        username: username, // Adding this for consistency
        matKhau: password,
        soDienThoai: phone,
        vaiTro: role,
        name,
        password: password,
        phone,
        role,
        isActive: true,
        nguoiQuanLy: session.user.role === 'chuNha' ? session.user.id : null,
        nguoiTao: session.user.id,
        daXacMinhEmail: !verificationRequired,
        maXacNhanEmail: verifyToken,
        hanMaXacNhanEmail: otpExpiry
      });
      await newUser.save();
    }

    // Send confirmation link email asynchronously
    if (verificationRequired && verifyToken && (email || newUser.email)) {
      const targetEmail = email || newUser.email;
      (async () => {
        try {
          const origin = request.nextUrl.origin;
          const confirmLink = `${origin}/api/auth/verify-link?email=${encodeURIComponent(targetEmail)}&token=${verifyToken}&type=${role}`;
          
          await sendAccountConfirmationLinkEmail({
            email: targetEmail,
            khachThueName: name,
            confirmLink: confirmLink,
          });
          console.log(`[Admin User API] Confirmation link sent to ${targetEmail}`);
        } catch (mailErr) {
          console.error(`[Admin User API] Failed to send confirmation email:`, mailErr);
        }
      })();
    }

    return NextResponse.json({ success: true, message: 'Tạo tài khoản thành công' }, { status: 201 });
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
