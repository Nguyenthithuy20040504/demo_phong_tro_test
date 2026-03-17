import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import KhachThue from '@/models/KhachThue';
import HopDong from '@/models/HopDong';
import HoaDon from '@/models/HoaDon';
import mongoose from "mongoose";
import "@/models/Phong";
import "@/models/ToaNha";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // <-- chỉnh đúng đường dẫn của bạn

export async function GET(request: NextRequest) {
  try {
    // ================== 🔹 PHẦN NÀY LÀ PHẦN QUAN TRỌNG ĐÃ ĐỔI 🔹 ==================

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - no session" },
        { status: 401 }
      );
    }

    // Lấy id khách thuê từ session
    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - missing user id" },
        { status: 401 }
      );
    }

    // (Tùy bạn có thể check role trong session nếu muốn)
    if (session.user.role !== "khachThue") {
      return NextResponse.json(
        { success: false, message: "Forbidden - not khachThue" },
        { status: 403 }
      );
    }

    // ================== 🔹 HẾT PHẦN ĐỔI 🔹 ==================

    await dbConnect();

    // Lấy thông tin khách thuê (ĐỔI: dùng userId từ session thay vì decoded.id)
    const khachThue = await KhachThue.findById(userId);

    if (!khachThue) {
      return NextResponse.json(
        { success: false, message: 'Khách thuê không tồn tại' },
        { status: 404 }
      );
    }

    // Lấy hợp đồng hiện tại (GIỮ NGUYÊN LOGIC CỦA BẠN)
    const hopDongHienTai = await HopDong.findOne({
      khachThueId: khachThue._id,
      trangThai: 'hoatDong',
      ngayBatDau: { $lte: new Date() },
      ngayKetThuc: { $gte: new Date() }
    })
      .populate('phong', 'maPhong dienTich giaThue tienCoc toaNha')
      .populate({
        path: 'phong',
        populate: {
          path: 'toaNha',
          select: 'tenToaNha diaChi'
        }
      });

    // Đếm số hóa đơn chưa thanh toán
    const soHoaDonChuaThanhToan = await HoaDon.countDocuments({
      khachThue: khachThue._id,
      trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] }
    });

    // Lấy hóa đơn gần nhất
    const hoaDonGanNhat = await HoaDon.findOne({
      khachThue: khachThue._id
    })
      .sort({ ngayTao: -1 })
      .populate('phong', 'maPhong');

    return NextResponse.json({
      success: true,
      data: {
        khachThue: {
          _id: khachThue._id,
          hoTen: khachThue.hoTen,
          soDienThoai: khachThue.soDienThoai,
          email: khachThue.email,
          cccd: khachThue.cccd,
          ngaySinh: khachThue.ngaySinh,
          gioiTinh: khachThue.gioiTinh,
          queQuan: khachThue.queQuan,
          ngheNghiep: khachThue.ngheNghiep,
          trangThai: khachThue.trangThai,
        },
        hopDongHienTai,
        soHoaDonChuaThanhToan,
        hoaDonGanNhat
      }
    });

  } catch (error) {
    console.error('Error fetching khach thue info:', error);
    return NextResponse.json(
      { success: false, message: 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
