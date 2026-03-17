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
    const { name, phone, role, isActive } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID người dùng không hợp lệ' }, { status: 400 });
    }

    await dbConnect();
    
    // Check if ChuNha is trying to edit a user they don't own
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
    
    const updatedUser = await NguoiDung.findByIdAndUpdate(
      id,
      { 
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
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -matKhau');
    
    if (!updatedUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng này' }, { status: 404 });
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
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || (session.user.role !== 'admin' && session.user.role !== 'chuNha')) {
      return NextResponse.json({ message: 'Bạn không có quyền xóa tài khoản' }, { status: 401 });
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID tài khoản không hợp lệ' }, { status: 400 });
    }

    // Prevent user from deleting themselves
    if (session.user.id === id) {
      return NextResponse.json({ message: 'Hệ thống chặn chức năng tự xóa quyền truy cập của chính bạn' }, { status: 400 });
    }

    await dbConnect();

    // Check if ChuNha is trying to delete a user they don't own
    if (session.user.role === 'chuNha') {
       const userToDelete = await NguoiDung.findById(id);
       if (!userToDelete) {
           return NextResponse.json({ message: 'Không tìm thấy tài khoản để xóa' }, { status: 404 });
       }
       
       const managedBy = userToDelete.nguoiQuanLy?.toString();
       if (managedBy !== session.user.id) {
           return NextResponse.json({ message: 'Bạn chỉ có quyền xóa tài khoản do mình quản lý' }, { status: 403 });
       }
    }
    
    const deletedUser = await NguoiDung.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản để xóa' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Không thể xóa tài khoản lúc này, vui lòng thử lại sau' }, { status: 500 });
  }
}
