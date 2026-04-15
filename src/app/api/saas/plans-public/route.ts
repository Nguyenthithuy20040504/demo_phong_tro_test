import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GoiDichVu from '@/models/GoiDichVu';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const plans = await GoiDichVu.find({ isActive: true }).sort({ gia: 1 });
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching SaaS plans:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
