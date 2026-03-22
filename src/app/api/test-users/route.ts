import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    // Simulate query for admin
    let query: any = {};
    const users = await NguoiDung.find(query, { password: 0, matKhau: 0 }).sort({ createdAt: -1 });

    const updatedUsers = [];
    
    let dbg = [];
    for (const user of users) {
      if (!user.ngayHetHan) {
        dbg.push(user.email + ' (NO EXPIRY, WILL MIGRATE)');
      } else {
        dbg.push(user.email + ' (HAS EXPIRY: ' + user.ngayHetHan + ')');
        updatedUsers.push(user);
      }
    }

    return NextResponse.json({ success: true, count: users.length, mappedCount: updatedUsers.length, list: dbg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
