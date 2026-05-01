const mongoose = require('mongoose');
const mongoUri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));
    
    console.log('--- ALL USERS (Filtered for Ly) ---');
    const users = await NguoiDung.find({ }).lean();
    for (const u of users) {
      const name = u.ten || u.name || '';
      if (name.includes('Ly') || (u.email && u.email.includes('ly')) || (u.tenDangNhap && u.tenDangNhap.includes('ly'))) {
        console.log(`ID: ${u._id}, Name: ${name}, Email: ${u.email}, Phone: ${u.soDienThoai || u.phone}, Username: ${u.tenDangNhap || u.username}`);
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
