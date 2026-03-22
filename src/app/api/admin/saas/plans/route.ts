import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import GoiDichVu from '@/models/GoiDichVu';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin' && session?.user?.role !== 'chuNha') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }


    await dbConnect();
    const plans = await GoiDichVu.find({}).sort({ gia: 1 });
    return NextResponse.json(plans);
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
    
    const newPlan = await GoiDichVu.create(body);
    return NextResponse.json(newPlan, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
