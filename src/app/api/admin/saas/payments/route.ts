import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SaaSPayment from '@/models/SaaSPayment';
import NguoiDung from '@/models/NguoiDung';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const payments = await SaaSPayment.find({})
        .populate('chuNha', 'name email ten')
        .populate('goiDichVu', 'ten')
        .sort({ createdAt: -1 });

    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    await dbConnect();

    // Tạo hóa đơn
    const payment = await SaaSPayment.create(body);
    
    // Nếu trạng thái là đã thanh toán, cập nhật ngayHetHan cho chủ nhà
    if (body.trangThai === 'daThanhToan') {
        await NguoiDung.findByIdAndUpdate(body.chuNha, {
            ngayHetHan: body.ngayHetHanMoi
        });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
