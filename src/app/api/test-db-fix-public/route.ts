import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ToaNha from '@/models/ToaNha';
import NguoiDung from '@/models/NguoiDung';

export async function GET() {
  await dbConnect();
  
  const admin = await NguoiDung.findOne({vaiTro: 'admin'}).lean() as any;
  if (!admin) return NextResponse.json({msg: 'No admin'});
  
  const toanhas = await ToaNha.find({}).lean() as any[];
  let updated = 0;
  for (const tn of toanhas) {
    const chu = await NguoiDung.findById(tn.chuSoHuu).lean();
    if (!chu) {
       await ToaNha.updateOne({_id: tn._id}, { $set: { chuSoHuu: admin._id } });
       updated++;
    }
  }
  
  return NextResponse.json({msg: `Updated ${updated} buildings to admin.`, admin: admin._id});
}
