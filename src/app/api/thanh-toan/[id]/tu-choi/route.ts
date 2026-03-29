import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ThanhToan from '@/models/ThanhToan';
import HoaDon from '@/models/HoaDon';
import ThongBao from '@/models/ThongBao';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== 'admin' && session.user.role !== 'chuNha' && session.user.role !== 'nhanVien')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Find payment
    const thanhToan = await ThanhToan.findById(params.id);
    if (!thanhToan) {
      return NextResponse.json({ message: 'Thanh toán không tồn tại' }, { status: 404 });
    }

    if (thanhToan.trangThai !== 'choDuyet') {
      return NextResponse.json({ message: 'Chỉ có thể từ chối thanh toán đang chờ duyệt' }, { status: 400 });
    }

    // Process rejection
    thanhToan.trangThai = 'tuChoi';
    await thanhToan.save();

    // Reset Invoice daThanhToan if needed? Actually we didn't add the amount to daThanhToan when it was choDuyet.
    // We just need to check if we should reset the HoaDon's trangThai back if there are no other pending payments.
    const hoaDon = await HoaDon.findById(thanhToan.hoaDon);
    if (hoaDon) {
      // Find if there are any other 'choDuyet' payments for this invoice
      const pendingPayments = await ThanhToan.countDocuments({ hoaDon: hoaDon._id, trangThai: 'choDuyet', _id: { $ne: thanhToan._id } });
      
      if (pendingPayments === 0 && hoaDon.trangThai === 'choDuyet') {
        if (hoaDon.conLai <= 0) {
           hoaDon.trangThai = 'daThanhToan';
        } else {
           // Đánh dấu hóa đơn là "từ chối" để khách thuê biết cần nộp lại
           hoaDon.trangThai = 'tuChoi';
        }
        await hoaDon.save();
      }

      // Send notification to tenant
      try {
        const noiDungThongBao = `Biên lai thanh toán ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(thanhToan.soTien)} cho Hóa đơn ${hoaDon.maHoaDon} (Tháng ${hoaDon.thang}/${hoaDon.nam}) ĐÃ BỊ TỪ CHỐI. Vui lòng liên hệ quản lý để kiểm tra.`;
        
        const thongBao = new ThongBao({
          tieuDe: 'Thanh toán bị từ chối',
          noiDung: noiDungThongBao,
          loai: 'suCo',
          nguoiGui: session.user.id,
          nguoiNhan: [hoaDon.khachThue],
          ngayGui: new Date()
        });
        
        await thongBao.save();
      } catch (e) {
        console.error('Error creating notification', e);
      }
    }

    return NextResponse.json({ success: true, message: 'Đã từ chối thanh toán' });
  } catch (error) {
    console.error('Error rejecting payment', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
