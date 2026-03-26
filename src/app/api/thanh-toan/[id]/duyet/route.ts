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

    if (thanhToan.trangThai === 'daDuyet') {
      return NextResponse.json({ message: 'Thanh toán này đã được duyệt trước đó' }, { status: 400 });
    }

    // Process approval
    thanhToan.trangThai = 'daDuyet';
    // Optionally change nguoiNhan if we want to record WHO approved it, but keeping the original submitter or receiver makes sense.
    await thanhToan.save();

    // Update Invoice DaThanhToan
    const hoaDon = await HoaDon.findById(thanhToan.hoaDon);
    if (hoaDon) {
      hoaDon.daThanhToan += thanhToan.soTien;
      hoaDon.conLai = hoaDon.tongTien - hoaDon.daThanhToan;
      
      const ThanhToan = (await import('@/models/ThanhToan')).default;
      const pendingPayments = await ThanhToan.countDocuments({ 
        hoaDon: hoaDon._id, 
        trangThai: 'choDuyet', 
        _id: { $ne: thanhToan._id } 
      });

      if (hoaDon.conLai <= 0) {
        hoaDon.trangThai = 'daThanhToan';
      } else if (pendingPayments > 0) {
        hoaDon.trangThai = 'choDuyet';
      } else if (hoaDon.daThanhToan > 0) {
        hoaDon.trangThai = 'daThanhToanMotPhan';
      } else {
        hoaDon.trangThai = 'chuaThanhToan';
      }
      
      await hoaDon.save();

      // Send notification to tenant
      try {
        const noiDungThongBao = `Biên lai thanh toán ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(thanhToan.soTien)} cho Hóa đơn ${hoaDon.maHoaDon} (Tháng ${hoaDon.thang}/${hoaDon.nam}) đã được phê duyệt.`;
        
        const thongBao = new ThongBao({
          tieuDe: 'Xác nhận thanh toán',
          noiDung: noiDungThongBao,
          loai: 'hoaDon',
          nguoiGui: session.user.id,
          nguoiNhan: [hoaDon.khachThue],
          ngayGui: new Date()
        });
        
        await thongBao.save();
      } catch (e) {
        console.error('Error creating notification', e);
      }
    }

    return NextResponse.json({ success: true, message: 'Duyệt thanh toán thành công' });
  } catch (error) {
    console.error('Error approving payment', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
