import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import HoaDon from '@/models/HoaDon';
import ChiSoDienNuoc from '@/models/ChiSoDienNuoc';
import Phong from '@/models/Phong';
import { isToaNhaAccessible } from '@/lib/auth-utils';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { toaNhaId, thang, nam } = await request.json();

    if (!toaNhaId || !thang || !nam) {
      return NextResponse.json(
        { message: 'Thiếu thông tin tòa nhà, tháng hoặc năm' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Kiểm tra quyền tòa nhà
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập tòa nhà này' },
        { status: 403 }
      );
    }

    // Lấy tất cả phòng trong tòa nhà
    const phongs = await Phong.find({ toaNha: toaNhaId }).select('_id maPhong');
    const phongIds = phongs.map(p => p._id);

    // Lấy hợp đồng đang hoạt động của các phòng
    const currentDate = new Date();
    const activeContracts = await HopDong.find({
      phong: { $in: phongIds },
      trangThai: 'hoatDong',
      ngayBatDau: { $lte: currentDate },
      ngayKetThuc: { $gte: currentDate },
    }).populate('phong').populate('nguoiDaiDien');

    let createdCount = 0;
    let errors = [];

    for (const contract of activeContracts) {
      try {
        // Kiểm tra hóa đơn tồn tại
        const existingInvoice = await HoaDon.findOne({
          hopDong: contract._id,
          thang: thang,
          nam: nam,
        });

        if (existingInvoice) {
          continue; // Đã có hóa đơn rồi
        }

        // Lấy chỉ số điện nước tháng này
        const chiSo = await ChiSoDienNuoc.findOne({
          phong: contract.phong._id,
          thang: thang,
          nam: nam,
        });

        if (!chiSo) {
          errors.push(`Phòng ${contract.phong.maPhong} chưa được chốt số điện nước`);
          continue;
        }

        // Tính toán (Logic y hệt như auto-invoice cũ)
        const tienDien = (chiSo.chiSoDienMoi - chiSo.chiSoDienCu) * contract.giaDien;
        const tienNuoc = (chiSo.chiSoNuocMoi - chiSo.chiSoNuocCu) * contract.giaNuoc;
        const tongTienDichVu = contract.phiDichVu.reduce((sum: number, dv: { gia: number }) => sum + dv.gia, 0);
        const tongTien = contract.giaThue + tienDien + tienNuoc + tongTienDichVu;

        const invoiceNumber = `HD${nam}${thang.toString().padStart(2, '0')}${contract.phong.maPhong}`;
        
        // Hạn thanh toán mặc định theo contract.ngayThanhToan
        const dueDate = new Date(nam, thang - 1, contract.ngayThanhToan);
        if (dueDate < new Date()) {
           // Nếu ngày thanh toán đã qua trong quá khứ của tháng này, có thể để nguyên hoặc lùi 1 tháng?
           // Thường thì hóa đơn tháng này, deadline là ngày X của tháng này.
        }

        const newInvoice = new HoaDon({
          maHoaDon: invoiceNumber,
          hopDong: contract._id,
          phong: contract.phong._id,
          khachThue: contract.nguoiDaiDien._id,
          thang,
          nam,
          tienPhong: contract.giaThue,
          tienDien,
          soDien: chiSo.chiSoDienMoi - chiSo.chiSoDienCu,
          chiSoDienBanDau: chiSo.chiSoDienCu,
          chiSoDienCuoiKy: chiSo.chiSoDienMoi,
          tienNuoc,
          soNuoc: chiSo.chiSoNuocMoi - chiSo.chiSoNuocCu,
          chiSoNuocBanDau: chiSo.chiSoNuocCu,
          chiSoNuocCuoiKy: chiSo.chiSoNuocMoi,
          phiDichVu: contract.phiDichVu,
          tongTien,
          daThanhToan: 0,
          conLai: tongTien,
          hanThanhToan: dueDate,
          trangThai: 'chuaThanhToan',
          loaiHoaDon: 'tuDong'
        });

        await newInvoice.save();
        createdCount++;
      } catch (err: any) {
        errors.push(`Lỗi tại phòng ${contract.phong.maPhong}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Đã tạo ${createdCount} hóa đơn. Có ${errors.length} cảnh báo.`,
    });

  } catch (error) {
    console.error('Error batch generating invoices:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
