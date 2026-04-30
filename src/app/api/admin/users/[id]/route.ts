import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || (session.user.role !== 'admin' && session.user.role !== 'chuNha')) {
      return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { 
      name, email, username, phone, role, isActive,
      cccd, ngaySinh, gioiTinh, queQuan, ngheNghiep, anhCCCD,
      goiDichVu, ngayHetHan
    } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID người dùng không hợp lệ' }, { status: 400 });
    }

    await dbConnect();
    const KhachThue = (await import('@/models/KhachThue')).default;
    
    // Check if new username is unique if changed
    if (username) {
        const existingUsernameInNguoiDung = await NguoiDung.findOne({ username, _id: { $ne: id } });
        const existingUsernameInKhachThue = await KhachThue.findOne({ tenDangNhap: username, _id: { $ne: id } });
        
        if (existingUsernameInNguoiDung || existingUsernameInKhachThue) {
            return NextResponse.json({ message: 'Tên đăng nhập này đã tồn tại trong hệ thống' }, { status: 400 });
        }
    }

    let userToEdit = await NguoiDung.findById(id);
    let khachThueToEdit = null;
    
    if (!userToEdit) {
        khachThueToEdit = await KhachThue.findById(id);
    }

    if (!userToEdit && !khachThueToEdit) {
        return NextResponse.json({ message: 'Không tìm thấy người dùng này' }, { status: 404 });
    }

    // Permission check
    if (session.user.role === 'chuNha') {
       const currentUser = userToEdit || (khachThueToEdit as any);
       const managedBy = currentUser.nguoiQuanLy?.toString();
       if (managedBy !== session.user.id) {
           return NextResponse.json({ message: 'Bạn chỉ có quyền chỉnh sửa tài khoản do mình quản lý' }, { status: 403 });
       }
    }

    let updatedUser;

    if (userToEdit) {
        const updateData: any = {
            ten: name,
            email: email,
            username: username,
            soDienThoai: phone,
            vaiTro: role,
            trangThai: isActive ? 'hoatDong' : 'khoa',
            name,
            phone,
            role,
            isActive,
            updatedAt: new Date(),
            cccd: cccd !== undefined ? cccd : undefined,
            ngaySinh: ngaySinh ? new Date(ngaySinh) : undefined,
            gioiTinh: gioiTinh !== undefined ? gioiTinh : undefined,
            queQuan: queQuan !== undefined ? queQuan : undefined,
            ngheNghiep: ngheNghiep !== undefined ? ngheNghiep : undefined,
            anhCCCD: anhCCCD !== undefined ? anhCCCD : undefined
        };

        if (session.user.role === 'admin') {
            if (goiDichVu !== undefined) updateData.goiDichVu = goiDichVu;
            if (ngayHetHan !== undefined) updateData.ngayHetHan = ngayHetHan ? new Date(ngayHetHan) : null;
        }

        updatedUser = await NguoiDung.findByIdAndUpdate(id, updateData, { new: true }).select('-password -matKhau');
        if (!updatedUser) return NextResponse.json({ message: 'Lỗi cập nhật thông tin người dùng' }, { status: 500 });
        
        // Sync to KhachThue if linked
        try {
            const linkedKT = await KhachThue.findOne({ $or: [{ _id: id }, { soDienThoai: userToEdit.soDienThoai }] });
            if (linkedKT) {
                const ktUpdate: any = {};
                if (name) ktUpdate.hoTen = name;
                if (email !== undefined) ktUpdate.email = email;
                if (phone) ktUpdate.soDienThoai = phone;
                if (username) ktUpdate.tenDangNhap = username;
                await KhachThue.findByIdAndUpdate(linkedKT._id, ktUpdate);
            }
        } catch (e) { console.error('Sync error:', e); }
    } else {
        // Edit in KhachThue model directly
        const ktUpdate: any = {
            hoTen: name,
            email: email,
            tenDangNhap: username,
            soDienThoai: phone,
            trangThai: isActive ? 'dangThue' : 'daTraPhong', // simplified mapping
            updatedAt: new Date()
        };
        if (cccd) ktUpdate.cccd = cccd;
        if (ngaySinh) ktUpdate.ngaySinh = new Date(ngaySinh);
        if (gioiTinh) ktUpdate.gioiTinh = gioiTinh;
        if (queQuan) ktUpdate.queQuan = queQuan;

        updatedUser = await KhachThue.findByIdAndUpdate(id, ktUpdate, { new: true }).lean();
        if (!updatedUser) return NextResponse.json({ message: 'Không tìm thấy hồ sơ khách thuê' }, { status: 404 });
        // Map back to User-like object for response
        updatedUser = {
            ...updatedUser,
            _id: updatedUser._id.toString(),
            name: updatedUser.hoTen,
            username: updatedUser.tenDangNhap,
            phone: updatedUser.soDienThoai,
            role: 'khachThue',
            isActive: updatedUser.trangThai === 'dangThue'
        };
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống khi cập nhật người dùng' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Không cho phép xóa tài khoản để đảm bảo tính toàn vẹn dữ liệu
  // Các hợp đồng, hóa đơn, thanh toán đều liên kết tới tài khoản người dùng
  // Thay vì xóa, hãy sử dụng chức năng "Khóa tài khoản" để vô hiệu hóa
  return NextResponse.json(
    { 
      message: 'Không cho phép xóa tài khoản người dùng để đảm bảo tính toàn vẹn dữ liệu và lưu log ở các hợp đồng, hóa đơn. Vui lòng sử dụng chức năng "Khóa tài khoản" để vô hiệu hóa tài khoản này.' 
    }, 
    { status: 403 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || (session.user.role !== 'admin' && session.user.role !== 'chuNha')) {
      return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID người dùng không hợp lệ' }, { status: 400 });
    }

    await dbConnect();
    
    const userToUpdate = await NguoiDung.findById(id);
    if (!userToUpdate) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng này' }, { status: 404 });
    }

    // Permission checks
    if (session.user.role === 'chuNha') {
      // Landlord check
      const managedBy = userToUpdate.nguoiQuanLy?.toString();
      const isActuallyStaffOrTenant = userToUpdate.vaiTro === 'nhanVien' || userToUpdate.vaiTro === 'khachThue';
      
      if (managedBy !== session.user.id || !isActuallyStaffOrTenant) {
        return NextResponse.json({ message: 'Bạn chỉ có quyền đặt lại mật khẩu cho nhân viên hoặc khách thuê do mình quản lý' }, { status: 403 });
      }
    }

    // Set password (this will trigger pre-save hook for hashing)
    userToUpdate.matKhau = password;
    userToUpdate.password = password;
    await userToUpdate.save();

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống khi đặt lại mật khẩu' }, { status: 500 });
  }
}

