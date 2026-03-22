import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Clear existing data
    await Promise.all([
      NguoiDung.deleteMany({}),
      GoiDichVu.deleteMany({})
    ]);

    // Create admin user
    const admin = new NguoiDung({
      ten: 'Admin',
      email: 'demo_dev@example.com',
      matKhau: '123456',
      soDienThoai: '0888888888',
      vaiTro: 'admin',
      trangThai: 'hoatDong',
      name: 'Admin',
      password: '123456',
      phone: '0888888888',
      role: 'admin',
      isActive: true,
      goiDichVu: 'mienPhi',
      ngayHetHan: new Date(2099, 11, 31)
    });
    await admin.save();

    // Create SaaS plans
    await GoiDichVu.create([
      {
        ten: 'Gói Miễn Phí',
        moTa: 'Miễn phí 1 tháng đầu tiên cho mọi khách hàng mới.',
        gia: 0,
        thoiGian: 1,
        maxPhong: 10,
        features: ["Quản lý tối đa 10 phòng", "Đầy đủ tính năng cơ bản", "Hỗ trợ qua Zalo/Email"],
        isPopular: false
      },
      {
        ten: 'Gói Cơ Bản',
        moTa: 'Giải pháp tối ưu cho chủ trọ mới bắt đầu.',
        gia: 1000000,
        thoiGian: 1,
        maxPhong: 20,
        features: ["Quản lý tối đa 20 phòng", "Tự động xuất hóa đơn PDF", "Báo cáo cơ bản"],
        isPopular: false
      },
      {
        ten: 'Gói Chuyên Nghiệp',
        moTa: 'Lựa chọn phổ biến nhất cho dãy trọ vừa.',
        gia: 5000000,
        thoiGian: 6,
        maxPhong: -1,
        features: ["Quản lý không giới hạn phòng", "Nhắc nợ tự động qua Zalo", "Hệ thống báo cáo chuyên sâu"],
        isPopular: true
      }
    ]);

    // Create more realistic demo users
    const landlordId1 = new mongoose.Types.ObjectId('6979af9a3b34a80a01937d3f');
    const landlordId2 = new mongoose.Types.ObjectId('69b98e5f18afff555ab26bde');

    const landlord = new NguoiDung({
      _id: landlordId1,
      ten: 'Nguyễn Văn Chủ Nhà',
      email: 'landlord@example.com',
      matKhau: '123456',
      soDienThoai: '0901234567',
      vaiTro: 'chuNha',
      trangThai: 'hoatDong',
      name: 'Nguyễn Văn Chủ Nhà',
      password: '123456',
      phone: '0901234567',
      role: 'chuNha',
      isActive: true,
      goiDichVu: 'coBan',
      ngayHetHan: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });
    await landlord.save();

    const specialUser = new NguoiDung({
      _id: landlordId2,
      ten: 'ole ola hahaha',
      email: 'chu_nha3@example.com',
      matKhau: '123456',
      soDienThoai: '0359585988',
      vaiTro: 'chuNha',
      trangThai: 'hoatDong',
      name: 'ole ola hahaha',
      password: '123456',
      phone: '0359585988',
      role: 'chuNha',
      isActive: true,
      goiDichVu: 'mienPhi',
      ngayHetHan: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });
    await specialUser.save();

    const employee = new NguoiDung({
      ten: 'Trần Thị Nhân Viên',
      email: 'staff@example.com',
      matKhau: '123456',
      soDienThoai: '0901234568',
      vaiTro: 'nhanVien',
      trangThai: 'hoatDong',
      name: 'Trần Thị Nhân Viên',
      password: '123456',
      phone: '0901234568',
      role: 'nhanVien',
      isActive: true,
      nguoiQuanLy: landlord._id,
      ngayHetHan: landlord.ngayHetHan
    });
    await employee.save();

    const tenant = new NguoiDung({
      ten: 'Lê Văn Khách Thuê',
      email: 'tenant@example.com',
      matKhau: '123456',
      soDienThoai: '0901234569',
      vaiTro: 'khachThue',
      trangThai: 'hoatDong',
      name: 'Lê Văn Khách Thuê',
      password: '123456',
      phone: '0901234569',
      role: 'khachThue',
      isActive: true,
      ngayHetHan: new Date(2099, 11, 31)
    });
    await tenant.save();
   
    return NextResponse.json({
      success: true,
      message: 'Seed data đã được tạo thành công, bao gồm các Gói dịch vụ.',
      data: {
        admin: admin.email
      }
    });

  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
