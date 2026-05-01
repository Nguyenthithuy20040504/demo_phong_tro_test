import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import SaaSPayment from '@/models/SaaSPayment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '12m'; // Default to 12 months
    let monthsToFetch = 12;
    if (range === '3m') monthsToFetch = 3;
    if (range === '6m') monthsToFetch = 6;
    if (range === '12m') monthsToFetch = 12;

    // 4. Tài khoản sắp hết hạn (trong vòng 7 ngày)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Chuẩn bị query mảng tháng cho Promise.all
    const now = new Date();
    const monthQueries = [];
    for (let i = monthsToFetch - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        monthQueries.push({ d, nextD });
    }

    // Thực thi toàn bộ truy vấn song song
    const [
      totalLandlords,
      activeLandlords,
      allPayments,
      expiringSoon,
      recentPayments,
      ...monthlyPaymentsResults
    ] = await Promise.all([
      NguoiDung.countDocuments({ role: 'chuNha' }),
      NguoiDung.countDocuments({ role: 'chuNha', isActive: true }),
      SaaSPayment.find({ trangThai: 'daThanhToan' }),
      NguoiDung.find({
          role: 'chuNha',
          ngayHetHan: { $gt: now, $lte: sevenDaysFromNow }
      }).select('name email phone ngayHetHan goiDichVu').limit(5),
      SaaSPayment.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('chuNha', 'name email'),
      ...monthQueries.map(q => 
        SaaSPayment.find({
            trangThai: 'daThanhToan',
            ngayThanhToan: { $gte: q.d, $lt: q.nextD }
        })
      )
    ]);

    const totalRevenue = allPayments.reduce((acc: number, p: any) => acc + p.soTien, 0);

    const months = monthQueries.map((q, index) => ({
      name: q.d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
      revenue: monthlyPaymentsResults[index].reduce((acc: number, p: any) => acc + p.soTien, 0)
    }));

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
