const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const SaasPayment = mongoose.models.SaaSPayment || mongoose.model('SaaSPayment', new mongoose.Schema({}, { strict: false }));
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));

    const user = await NguoiDung.findOne({ email: 'nt3thuy0504@gmail.com' });
    const payments = await SaasPayment.find({ chuNha: user._id }).sort({ createdAt: -1 });
    
    console.log('PAYMENTS:');
    payments.forEach(p => {
        console.log(`${p.maDonHang} | ${p.trangThai} | Expiry: ${p.ngayHetHanMoi} | Created: ${p.createdAt}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
