import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import GoiDichVu from '@/models/GoiDichVu';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    await dbConnect();

    const updatedPlan = await GoiDichVu.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedPlan) {
      return NextResponse.json({ message: 'Không tìm thấy gói dịch vụ' }, { status: 404 });
    }

    return NextResponse.json(updatedPlan);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const deletedPlan = await GoiDichVu.findByIdAndDelete(id);

    if (!deletedPlan) {
      return NextResponse.json({ message: 'Không tìm thấy gói dịch vụ' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa gói dịch vụ thành công' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
