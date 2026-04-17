import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ThongBao from '@/models/ThongBao';
import HoaDon from '@/models/HoaDon';
import HopDong from '@/models/HopDong';
import KhachThue from '@/models/KhachThue';
import Phong from '@/models/Phong';
import NguoiDung from '@/models/NguoiDung';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== 'chuNha' && session.user.role !== 'admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();
    const userId = session.user.id;
    const sender = new mongoose.Types.ObjectId(userId);
    let createdCount = 0;

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    const buildingQuery = accessibleToaNhaIds ? { toaNha: { $in: accessibleToaNhaIds } } : {};
    
    // Scan all if admin? Or skip if admin doesn't want to notify tenants?
    // Given the request, we'll allow it but handle the query correctly.

    // --- Tenant Notifications (Only for Chu Nha / Nhan Vien) ---
    if (session.user.role !== 'admin') {
      // --- 1. Hóa đơn quá hạn ---
      const overduePhongs = await Phong.find(buildingQuery).select('_id');
      const overdueInvoices = await HoaDon.find({
        phong: { $in: overduePhongs.map(p => p._id) },
        trangThai: { $ne: 'daThanhToan' },
        hanThanhToan: { $lt: now }
      }).populate('khachThue').select('maHoaDon khachThue tongTien conLai hanThanhToan');

      for (const invoice of overdueInvoices) {
        const tenant = invoice.khachThue as any;
        if (!tenant?._id) continue;

        // Check if notification already sent this month for this invoice  
        const existingNotif = await ThongBao.findOne({
          nguoiGui: sender,
          nguoiNhan: tenant._id,
          loai: 'hoaDon',
          tieuDe: { $regex: invoice.maHoaDon }
        });
        if (existingNotif) continue;

        const hoTen = tenant.hoTen || tenant.ten || 'Khách thuê';
        await ThongBao.create({
          tieuDe: `Hóa đơn ${invoice.maHoaDon} đã quá hạn thanh toán`,
          noiDung: `Kính gửi ${hoTen},\n\nHóa đơn ${invoice.maHoaDon} của bạn đã quá hạn thanh toán vào ${new Date(invoice.hanThanhToan).toLocaleDateString('vi-VN')}.\n\nSố tiền còn lại cần thanh toán: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.conLai)}\n\nVui lòng thanh toán sớm để tránh phát sinh phí phạt. Nếu đã thanh toán, hãy thông báo cho chủ nhà để cập nhật hệ thống.\n\nTrân trọng.`,
          loai: 'hoaDon',
          nguoiGui: sender,
          nguoiNhan: [tenant._id],
          daDoc: []
        });
        createdCount++;
      }

      // --- 2. Hợp đồng sắp hết hạn (trong 30 ngày) ---
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(now.getDate() + 30);

      const expiringSoon = await HopDong.find({
        phong: { $in: overduePhongs.map(p => p._id) },
        trangThai: 'hoatDong',
        ngayKetThuc: { $gte: now, $lte: thirtyDaysLater }
      }).populate('nguoiDaiDien').select('maHopDong ngayKetThuc nguoiDaiDien');

      for (const hopDong of expiringSoon) {
        const tenant = hopDong.nguoiDaiDien as any;
        if (!tenant?._id) continue;

        const existingNotif = await ThongBao.findOne({
          nguoiGui: sender,
          loai: 'hopDong',
          tieuDe: { $regex: hopDong.maHopDong }
        });
        if (existingNotif) continue;

        const daysLeft = Math.ceil((new Date(hopDong.ngayKetThuc).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const hoTen = (tenant.hoTen || tenant.ten || 'Khách thuê');

        await ThongBao.create({
          tieuDe: `Hợp đồng ${hopDong.maHopDong} sắp hết hạn (còn ${daysLeft} ngày)`,
          noiDung: `Kính gửi ${hoTen},\n\nHợp đồng ${hopDong.maHopDong} của bạn sẽ hết hạn vào ngày ${new Date(hopDong.ngayKetThuc).toLocaleDateString('vi-VN')} (còn ${daysLeft} ngày).\n\nVui lòng liên hệ chủ nhà để gia hạn hợp đồng hoặc chuẩn bị cho việc chuyển đi.\n\nTrân trọng.`,
          loai: 'hopDong',
          nguoiGui: sender,
          nguoiNhan: [tenant._id],
          daDoc: []
        });
        createdCount++;
      }
    }

    // --- 3. SaaS Package Expiration (Only for Admin) ---
    if (session.user.role === 'admin') {
      const sevenDaysLater = new Date(now);
      sevenDaysLater.setDate(now.getDate() + 7);

      const expiringLandlords = await NguoiDung.find({
        vaiTro: 'chuNha',
        trangThai: 'hoatDong',
        ngayHetHan: { $gte: now, $lte: sevenDaysLater }
      }).select('_id ten email goiDichVu ngayHetHan');

      for (const landlord of expiringLandlords) {
        // Check if notification already sent this month for this expiration
        const existingNotif = await ThongBao.findOne({
          nguoiGui: sender,
          nguoiNhan: landlord._id,
          loai: 'he_thong',
          tieuDe: { $regex: 'Gói dịch vụ.*sắp hết hạn', $options: 'i' }
        });
        if (existingNotif) continue;

        const daysLeft = Math.ceil((new Date(landlord.ngayHetHan).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const packageName = landlord.goiDichVu === 'chuyenNghiep' ? 'Chuyên nghiệp' : (landlord.goiDichVu === 'coBan' ? 'Cơ bản' : 'Miễn phí');

        await ThongBao.create({
          tieuDe: `Cảnh báo: Gói dịch vụ ${packageName} sắp hết hạn`,
          noiDung: `Kính gửi ${landlord.ten},\n\nGói dịch vụ ${packageName} của bạn trên hệ thống Quản lý nhà trọ sẽ hết hạn vào ngày ${new Date(landlord.ngayHetHan).toLocaleDateString('vi-VN')} (còn ${daysLeft} ngày).\n\nVui lòng thực hiện gia hạn để không bị gián đoạn các tính năng quản lý và vận hành.\n\nTrân trọng,\nĐội ngũ Admin PiRoom.`,
          loai: 'he_thong',
          nguoiGui: sender,
          nguoiNhan: [landlord._id],
          daDoc: [],
          guiTatCa: false
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      message: `Đã tạo ${createdCount} thông báo tự động`
    });
  } catch (err) {
    console.error('Auto-notification error:', err);
    return NextResponse.json({ success: false, message: 'Lỗi tạo thông báo tự động' }, { status: 500 });
  }
}
