const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));
    const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha', new mongoose.Schema({}, { strict: false }));
    const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({}, { strict: false }));

    const user = await NguoiDung.findOne({ email: 'nt3thuy0504@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(0);
    }
    console.log('User ID:', user._id);

    // Find buildings owned by this user
    const buildings = await ToaNha.find({ chuSoHuu: user._id });
    const buildingIds = buildings.map(b => b._id);
    console.log('Building IDs:', buildingIds);

    // Find invoices related to these buildings
    // Invoices might be linked to phong, and phong linked to toaNha
    const rawInvoices = await HoaDon.find({ 
      // Need to find phongIds first or check how HoaDon is linked
    }).limit(10);
    
    // Let's just find invoices by chuNhaId if it exists in HoaDon
    const invoicesByChuNha = await HoaDon.find({ chuNhaId: user._id }).sort({ ngayTao: -1 }).limit(20);
    console.log('Invoices for landlord:', JSON.stringify(invoicesByChuNha, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
