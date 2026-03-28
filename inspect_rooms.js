require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const phongs = await mongoose.connection.db.collection('phongs').find({}).toArray();
  phongs.forEach(p => {
    console.log('maPhong:', p.maPhong, '| trangThai:', '[' + p.trangThai + ']', '| type:', typeof p.trangThai);
  });
  console.log('Total rooms:', phongs.length);
  process.exit(0);
}

check();
