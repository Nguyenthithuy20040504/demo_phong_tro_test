const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const GoiDichVu = mongoose.models.GoiDichVu || mongoose.model('GoiDichVu', new mongoose.Schema({}, { strict: false }));
    
    const packages = await GoiDichVu.find({});
    console.log('Packages Found:', JSON.stringify(packages.map(p => ({ ten: p.ten, gia: p.gia, thoiGian: p.thoiGian })), null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
