const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Explicitly define schema to query
    const db = mongoose.connection.db;
    
    const nguoiDungs = await db.collection('nguoidungs').find({ vaiTro: 'chuNha' }).project({ email: 1, ten: 1, hoTen: 1, name: 1, vaiTro: 1 }).toArray();
    const admins = await db.collection('nguoidungs').find({ vaiTro: 'admin' }).project({ email: 1, ten: 1, hoTen: 1, name: 1, vaiTro: 1 }).toArray();
    const khachThues = await db.collection('khachthues').find({}).project({ email: 1, hoTen: 1, cccd: 1 }).toArray();

    console.log('--- ADMIN ---');
    console.log(admins);
    console.log('\n--- CHỦ NHÀ ---');
    console.log(nguoiDungs);
    console.log('\n--- KHÁCH THUÊ ---');
    console.log(khachThues);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
checkDB();
