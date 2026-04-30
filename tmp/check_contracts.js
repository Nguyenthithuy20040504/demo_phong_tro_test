const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const HopDong = mongoose.models.HopDong || mongoose.model('HopDong', new mongoose.Schema({}, { strict: false }));
    const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', new mongoose.Schema({}, { strict: false }));
    
    // Find tenant first
    const tenant = await KhachThue.findOne({ 
      $or: [
        { email: 'nt3thuy0504@gmail.com' }, 
        { soDienThoai: '0339282227' }
      ] 
    });
    
    if (!tenant) {
      console.log('Tenant not found');
      process.exit(0);
    }
    
    console.log('Tenant ID:', tenant._id);

    // Find contracts where this tenant is involved
    const contracts = await HopDong.find({
      $or: [
        { khachThueId: tenant._id },
        { nguoiDaiDien: tenant._id }
      ]
    });

    console.log('Contracts Found:', contracts.length);
    contracts.forEach(c => {
      console.log(`- Contract: ${c.maHopDong}, Start: ${c.ngayBatDau}, End: ${c.ngayKetThuc}, Status: ${c.trangThai}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
