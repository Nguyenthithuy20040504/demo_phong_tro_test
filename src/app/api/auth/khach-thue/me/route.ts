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

    // Lấy thông tin khách thuê
    // Ưu tiên tìm trong bảng KhachThue bằng userId (trường hợp ID trùng)
    // Hoặc tìm bằng số điện thoại của user
    let khachThue = await KhachThue.findById(userId);
    
    if (!khachThue && session.user.phone) {
      khachThue = await KhachThue.findOne({ soDienThoai: session.user.phone });
    }

    // Xác định list IDs có thể liên kết với hợp đồng
    // Một số hợp đồng dùng ID của NguoiDung, một số dùng ID của KhachThue
    const linkedIds = [new mongoose.Types.ObjectId(userId)];
    if (khachThue && khachThue._id.toString() !== userId) {
      linkedIds.push(khachThue._id);
    }

    // Nếu không tìm thấy record trong KhachThue, tạo object giả từ session để frontend không lỗi
    const khachThueDisplay = khachThue ? {
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
    } : {
      _id: userId,
      hoTen: session.user.name || session.user.email || 'Khách thuê',
      soDienThoai: session.user.phone || '',
      email: session.user.email || '',
      trangThai: 'dangThue', // Giả định đang thuê nếu có hợp đồng
    };

    // Lấy tất cả hợp đồng hiện tại - Tìm theo bất kỳ ID nào trong linkedIds
    const hopDongList = await HopDong.find({
      khachThueId: { $in: linkedIds },
      trangThai: 'hoatDong'
    })
      .populate('phong', 'maPhong dienTich giaThue tienCoc toaNha')
      .populate({
        path: 'phong',
        populate: {
          path: 'toaNha',
          select: 'tenToaNha diaChi'
        }
      })
      .sort({ ngayTao: -1 });

    const hopDongHienTai = hopDongList.length > 0 ? hopDongList[0] : null;

    // Cập nhật trạng thái hiển thị nếu tìm thấy hợp đồng
    if (hopDongHienTai && khachThueDisplay.trangThai === 'chuaThue') {
       (khachThueDisplay as any).trangThai = 'dangThue';
    }

    // Đếm số hóa đơn chưa thanh toán - Dùng các IDs liên quan
    const soHoaDonChuaThanhToan = await HoaDon.countDocuments({
      khachThue: { $in: linkedIds },
      trangThai: { $in: ['chuaThanhToan', 'daThanhToanMotPhan', 'quaHan'] }
    });

    // Lấy hóa đơn gần nhất
    const hoaDonGanNhat = await HoaDon.findOne({
      khachThue: { $in: linkedIds }
    })
      .sort({ ngayTao: -1 })
      .populate('phong', 'maPhong');

    return NextResponse.json({
      success: true,
      data: {
        khachThue: khachThueDisplay,
        hopDongHienTai,
        hopDongList,
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
