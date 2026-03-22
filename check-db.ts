
import mongoose from 'mongoose';
import dbConnect from '../src/lib/mongodb';
import NguoiDung from '../src/models/NguoiDung';

async function checkUsers() {
  await dbConnect();
  const users = await NguoiDung.find({}, { name: 1, role: 1, vaiTro: 1, ngayHetHan: 1, createdAt: 1 }).limit(20);
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}

checkUsers();
