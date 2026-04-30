const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));

    const user = await NguoiDung.findOne({ email: 'nt3thuy0504@gmail.com' });
    if (user) {
      console.log('User found:', JSON.stringify({
        email: user.email,
        goiDichVu: user.goiDichVu,
        ngayHetHan: user.ngayHetHan,
        ngayTao: user.ngayTao,
        vaiTro: user.vaiTro
      }, null, 2));
    } else {
      console.log('User not found');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
