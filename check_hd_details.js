const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const hd = await db.collection('hopdongs').findOne({ maHopDong: 'HD-20260404-AMYT' });
  if (!hd) {
    console.log('Contract not found');
    process.exit(0);
  }
  const phong = await db.collection('phongs').findOne({ _id: hd.phong });
  const toaNha = phong ? await db.collection('toanhas').findOne({ _id: phong.toaNha }) : null;
  console.log('HD details:', { 
    code: hd.maHopDong, 
    status: hd.trangThai, 
    roomID: hd.phong, 
    roomName: phong?.maPhong,
    toaNhaID: phong?.toaNha,
    toaNhaName: toaNha?.tenToaNha
  });
  process.exit(0);
}

run();
