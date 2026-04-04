const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const targetId = new mongoose.Types.ObjectId('69c8195eb6f51efe5944f4e6');
  const hds = await db.collection('hopdongs').find({
    $or: [
      { khachThueId: targetId },
      { nguoiDaiDien: targetId }
    ]
  }).toArray();
  console.log('HDS for An:', hds.map(h => ({ code: h.maHopDong, status: h.trangThai, created: h.ngayTao })));
  process.exit(0);
}

run();
