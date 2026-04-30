const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));
    const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha', new mongoose.Schema({}, { strict: false }));
    const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({}, { strict: false }));
    const Phong = mongoose.models.Phong || mongoose.model('Phong', new mongoose.Schema({}, { strict: false }));

    const user = await NguoiDung.findOne({ email: 'nt3thuy0504@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(0);
    }
    console.log('User ID:', user._id);

    // List all buildings to see owners
    const allBuildings = await ToaNha.find({}).limit(5);
    console.log('All Buildings (sample):', allBuildings.map(b => ({ id: b._id, ten: b.tenToaNha, owner: b.chuSoHuu })));

    // Find buildings owned by this user
    const buildings = await ToaNha.find({ chuSoHuu: user._id });
    console.log('Buildings owned by this user:', buildings.length);

    // If zero, maybe the chuSoHuu is a string?
    if (buildings.length === 0) {
        const buildingsStr = await ToaNha.find({ chuSoHuu: user._id.toString() });
        console.log('Buildings owned by this user (string ID):', buildingsStr.length);
    }

    // List invoices
    const invoices = await HoaDon.find({}).sort({ ngayTao: -1 }).limit(5);
    console.log('Sample Invoices:', JSON.stringify(invoices.map(i => ({ id: i._id, ma: i.maHoaDon, han: i.hanThanhToan, tt: i.trangThai })), null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
