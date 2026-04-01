import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';
import HopDong from '@/models/HopDong';
import ThongBao from '@/models/ThongBao';
import NguoiDung from '@/models/NguoiDung';
import ToaNha from '@/models/ToaNha';
import Phong from '@/models/Phong';
import ChiSoDienNuoc from '@/models/ChiSoDienNuoc';

export async function GET(request: NextRequest) {
  try {
    // Basic verification for Cron (optional: add a secret token in headers)
    const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    await dbConnect();

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentHour = now.getHours();

    let tenantNotifiedCount = 0;
    let landlordNotifiedCount = 0;

    // 1. GỬI THÔNG BÁO CHO KHÁCH THUÊ (Hàng ngày)
    // Tìm các hóa đơn tháng này mà chưa được gửi thông báo (có thể đánh dấu bằng flag hoặc check ngày)
    // Ở đây ta check ngayThanhToan của hợp đồng liên kết
    const invoicesToday = await HoaDon.find({
      thang: currentMonth,
      nam: currentYear,
      loaiHoaDon: 'tuDong'
    }).populate({
      path: 'hopDong',
      match: { ngayThanhToan: currentDay }
    });

    for (const invoice of invoicesToday) {
      if (!invoice.hopDong) continue; // Không phải ngày thanh toán của hợp đồng này

      // Kiểm tra xem đã gửi thông báo cho hóa đơn này chưa (để tránh gửi lặp nếu cron chạy nhiều lần)
      const existingNotif = await ThongBao.findOne({
        noiDung: { $regex: invoice.maHoaDon },
        loai: 'hoaDon',
        nguoiNhan: [invoice.khachThue]
      });

      if (!existingNotif) {
        const noiDungThongBao = `Chào bạn, hóa đơn thuê phòng tháng ${invoice.thang}/${invoice.nam} mới đã được tạo với tổng tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.tongTien)}. Hạn thanh toán đến ngày ${new Date(invoice.hanThanhToan).toLocaleDateString('vi-VN')}.`;
        
        await new ThongBao({
          tieuDe: 'Thông báo hóa đơn mới',
          noiDung: noiDungThongBao,
          loai: 'hoaDon',
          nguoiGui: 'SYSTEM', // Hoặc ID của Admin hệ thống
          nguoiNhan: [invoice.khachThue],
          ngayGui: new Date()
        }).save();
        
        tenantNotifiedCount++;
      }
    }

    // 2. NHẮC NHỞ CHỦ NHÀ (Ngày 1 lúc 20h)
    if (currentDay === 1 && currentHour >= 20) {
      // Tìm các tòa nhà/phòng chưa chốt số cho tháng này
      const buildings = await ToaNha.find({});
      
      for (const building of buildings) {
        const phongsInBuilding = await Phong.find({ toaNha: building._id });
        const phongIds = phongsInBuilding.map(p => p._id);
        
        // Kiểm tra xem có phòng nào của tòa nhà này chưa có ChiSoDienNuoc tháng này không
        const readingsCount = await ChiSoDienNuoc.countDocuments({
          phong: { $in: phongIds },
          thang: currentMonth,
          nam: currentYear
        });

        if (readingsCount < phongsInBuilding.length) {
          // Gửi thông báo cho chủ nhà
          const chuNha = await NguoiDung.findById(building.chuSoHuu);
          if (chuNha) {
            const noiDungNhacNho = `Nhắc nhở: Tòa nhà ${building.tenToaNha} hiện vẫn còn ${phongsInBuilding.length - readingsCount} phòng chưa được chốt số điện nước tháng ${currentMonth}/${currentYear}. Vui lòng hoàn tất trước khi tạo hóa đơn.`;
            
            await new ThongBao({
              tieuDe: '⚠️ Nhắc nhở chốt số điện nước',
              noiDung: noiDungNhacNho,
              loai: 'canhBao',
              nguoiGui: 'SYSTEM',
              nguoiNhan: [chuNha._id],
              ngayGui: new Date()
            }).save();
            
            landlordNotifiedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tenantNotifiedCount,
        landlordNotifiedCount,
        timestamp: now.toISOString()
      },
      message: `Đã hoàn thành kiểm tra hàng ngày vào ${now.toLocaleString('vi-VN')}`
    });

  } catch (error) {
    console.error('Error in daily billing trigger:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
