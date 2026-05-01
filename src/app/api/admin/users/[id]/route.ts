import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import ThongBao from '@/models/ThongBao';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || (session.user.role !== 'admin' && session.user.role !== 'chuNha')) {
      return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      name, email, phone, role, isActive,
      cccd, ngaySinh, gioiTinh, queQuan, ngheNghiep, anhCCCD,
      goiDichVu, ngayHetHan
    } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID người dùng không hợp lệ' }, { status: 400 });
    }

    await dbConnect();
    
    // Check if ChuNha is trying to edit a user they don't own
    // Check permissions and ownership
    if (session.user.role === 'chuNha') {
       const userToEdit = await NguoiDung.findById(id);
       if (!userToEdit) {
           return NextResponse.json({ message: 'Không tìm thấy người dùng này' }, { status: 404 });
       }
       
       // Robust check using toString for comparison
       const managedBy = userToEdit.nguoiQuanLy?.toString();
       if (managedBy !== session.user.id) {
           return NextResponse.json({ message: 'Bạn chỉ có quyền chỉnh sửa tài khoản do mình quản lý' }, { status: 403 });
       }
       
       if (role === 'admin' || role === 'chuNha') {
           return NextResponse.json({ message: 'Chủ nhà chỉ được cấp quyền Nhân Viên hoặc Khách Thuê' }, { status: 403 });
       }
    }
    // Admins can manage all roles, no extra check needed here

    const updateData: any = {
      // Vietnamese fields
      ten: name,
      soDienThoai: phone,
      vaiTro: role,
      trangThai: isActive ? 'hoatDong' : 'khoa',
      // English fields
      name,
      phone,
      role,
      isActive,
      updatedAt: new Date(),
      // Profile fields
      cccd: cccd !== undefined ? cccd : undefined,
      ngaySinh: ngaySinh ? new Date(ngaySinh) : undefined,
      gioiTinh: gioiTinh !== undefined ? gioiTinh : undefined,
      queQuan: queQuan !== undefined ? queQuan : undefined,
      ngheNghiep: ngheNghiep !== undefined ? ngheNghiep : undefined,
      anhCCCD: anhCCCD !== undefined ? anhCCCD : undefined
    };
    
    // Admin only fields (SaaS subscription)
    if (session.user.role === 'admin') {
      if (goiDichVu !== undefined) updateData.goiDichVu = goiDichVu;
      if (ngayHetHan !== undefined) updateData.ngayHetHan = ngayHetHan ? new Date(ngayHetHan) : null;
    }
    
    // Cập nhật email nếu có
    if (email !== undefined) {
      updateData.email = email;
    }
    
    const updatedUser = await NguoiDung.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password -matKhau');
    
    if (!updatedUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng này' }, { status: 404 });
    }

    // Gửi thông báo nếu có cập nhật gói dịch vụ hoặc ngày hết hạn (cho Chủ Trọ)
    if (session.user.role === 'admin' && (goiDichVu !== undefined || ngayHetHan !== undefined)) {
      const packageName = 
        updatedUser.goiDichVu === 'chuyenNghiep' ? 'Chuyên nghiệp (Enterprise)' : 
        updatedUser.goiDichVu === 'coBan' ? 'Cơ bản (Professional)' : 'Miễn phí (Tiêu chuẩn)';
      
      const expiryText = updatedUser.ngayHetHan ? new Date(updatedUser.ngayHetHan).toLocaleDateString('vi-VN') : 'Không giới hạn';
      
      await ThongBao.create({
        tieuDe: `Quản trị viên đã cập nhật gói dịch vụ của bạn`,
        noiDung: `Kính gửi ${updatedUser.ten || updatedUser.name},\n\nTài khoản của bạn vừa được cập nhật bởi hệ thống: \n- Gói hiện tại: ${packageName}\n- Thời hạn mới: ${expiryText}\n\nNếu bạn có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ.\n\nTrân trọng.`,
        loai: 'he_thong',
        nguoiGui: session.user.id,
        nguoiNhan: [updatedUser._id],
        daDoc: [],
        guiTatCa: false
      });
    }

    // ===== ĐỒNG BỘ DỮ LIỆU VỚI KHÁCH THUÊ =====
    // Nếu user có role khachThue, đồng bộ hoTen/email/soDienThoai sang bảng KhachThue
    try {
      const KhachThue = (await import('@/models/KhachThue')).default;
      
      // Tìm KhachThue bằng _id hoặc soDienThoai
      const khachThueRecord = await KhachThue.findOne({
        $or: [
          { _id: id },
          ...(phone ? [{ soDienThoai: phone }] : []),
          ...(updatedUser.soDienThoai ? [{ soDienThoai: updatedUser.soDienThoai }] : [])
        ]
      });
      
      if (khachThueRecord) {
        const ktUpdate: any = {};
        if (name) ktUpdate.hoTen = name;
        if (email !== undefined) ktUpdate.email = email;
        if (phone) ktUpdate.soDienThoai = phone;
        
        if (Object.keys(ktUpdate).length > 0) {
          await KhachThue.findByIdAndUpdate(khachThueRecord._id, ktUpdate);
          console.log(`Đã đồng bộ thông tin sang KhachThue: ${khachThueRecord._id}`);
        }
      }
    } catch (syncError) {
      console.error('Lỗi đồng bộ KhachThue (không ảnh hưởng kết quả):', syncError);
      // Không fail request chính nếu sync lỗi
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống khi cập nhật người dùng' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { 
          message: 'Chỉ có Quản trị viên tối cao mới được phép xóa tài khoản để đảm bảo an toàn dữ liệu. Vui lòng sử dụng chức năng "Khóa tài khoản" nếu bạn là Chủ nhà.' 
        }, 
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 });
    }

    await dbConnect();
    
    // Safety: Don't let admin delete themselves
    if (id === session.user.id) {
       return NextResponse.json({ message: 'Bạn không thể tự xóa chính mình!' }, { status: 400 });
    }

    const deletedUser = await NguoiDung.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa tài khoản thành công' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống khi xóa người dùng' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || (session.user.role !== 'admin' && session.user.role !== 'chuNha')) {
      return NextResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này' }, { status: 401 });
    }

    const { id } = await params;
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

