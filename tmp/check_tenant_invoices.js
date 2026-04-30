const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', new mongoose.Schema({}, { strict: false }));
    const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({}, { strict: false }));
    
    const tenants = await KhachThue.find({ 
      $or: [
        { email: 'nt3thuy0504@gmail.com' }, 
        { soDienThoai: '0339282227' }
      ] 
    });
    
    const tenantIds = tenants.map(t => t._id);
    console.log('Tenant IDs:', tenantIds);

    const invoices = await HoaDon.find({ 
      khachThue: { $in: tenantIds } 
    }).sort({ hanThanhToan: 1 });

    console.log('Invoices Found:', invoices.length);
    invoices.forEach(inv => {
      console.log(`- Invoice: ${inv.maHoaDon}, Due Date: ${inv.hanThanhToan}, Status: ${inv.trangThai}, Due Amount: ${inv.conLai}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
