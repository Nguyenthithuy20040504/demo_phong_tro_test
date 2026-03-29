import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const HopDong = mongoose.connection.collection('hopdongs');
  const contracts = await HopDong.find({}).project({maHopDong:1, 'snapshotKhachThue.hoTen':1, trangThai:1}).toArray();
  contracts.forEach((c: any) => {
    const snaps = c.snapshotKhachThue || [];
    console.log(`${c.maHopDong} [${c.trangThai}]: ${snaps.map((s:any) => s.hoTen).join(', ') || 'NO SNAPSHOT'}`);
  });
  await mongoose.disconnect();
}
main();
