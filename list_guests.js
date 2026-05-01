const mongoose = require('mongoose');
const mongoUri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({
      role: String,
      vaiTro: String,
      ten: String,
      name: String,
      soDienThoai: String,
      phone: String,
      tenDangNhap: String,
      username: String
    }, { strict: false }));
    
    const khachThues = await NguoiDung.find({ 
      $or: [{ role: 'khachThue' }, { vaiTro: 'khachThue' }] 
    }).lean();
    
    console.log(`Found ${khachThues.length} Guest accounts:`);
    khachThues.forEach(u => {
      console.log(`- ID: ${u._id}, Name: ${u.ten || u.name}, Phone: ${u.soDienThoai || u.phone}, UN: ${u.tenDangNhap || u.username}`);
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}
run();
