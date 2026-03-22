import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import SaaSPayment from '@/models/SaaSPayment';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();

    // 1. Tổng quát
    const totalLandlords = await NguoiDung.countDocuments({ role: 'chuNha' });
    const activeLandlords = await NguoiDung.countDocuments({ role: 'chuNha', isActive: true });
    
    // 2. Doanh thu tổng
    const allPayments = await SaaSPayment.find({ trangThai: 'daThanhToan' });
    const totalRevenue = allPayments.reduce((acc, p) => acc + p.soTien, 0);

    // 3. Doanh thu theo tháng (12 tháng gần nhất)
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthlyPayments = await SaaSPayment.find({
            trangThai: 'daThanhToan',
            ngayThanhToan: { $gte: d, $lt: nextD }
        });
        
        months.push({
            name: d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
            revenue: monthlyPayments.reduce((acc, p) => acc + p.soTien, 0)
        });
    }

    // 4. Tài khoản sắp hết hạn (trong vòng 7 ngày)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringSoon = await NguoiDung.find({
        role: 'chuNha',
        ngayHetHan: { $gt: now, $lte: sevenDaysFromNow }
    }).select('name email phone ngayHetHan goiDichVu').limit(5);

    // 5. Giao dịch gần đây
    const recentPayments = await SaaSPayment.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('chuNha', 'name email');

    return NextResponse.json({
        totalLandlords,
        activeLandlords,
        totalRevenue,
        monthlyRevenue: months,
        expiringSoon,
        recentPayments
    });

  } catch (error) {
    console.error('Error fetching SaaS stats:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
