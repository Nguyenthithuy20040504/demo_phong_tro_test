const mongoose = require('mongoose');
require('dotenv').config();

async function resetEmailFailures() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({}, { strict: false, collection: 'hoadons' }));
  const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', new mongoose.Schema({}, { strict: false, collection: 'khachthues' }));

  // Find tenants with these emails
  const tenants = await KhachThue.find({ email: { $in: ['vunghia691@gmail.com', 'daongocnam@gmail.com'] } }).lean();
  
  for (const t of tenants) {
    const result = await HoaDon.updateMany(
      { khachThue: t._id },
      { 
        $set: { soLanGuiEmailNhacNoThatBai: 0 },
        $unset: { ngayGuiEmailNhacNoCuoi: 1 }
      }
    );
    console.log(`Reset ${result.modifiedCount} invoices for ${t.hoTen} (${t.email})`);
  }
  
  process.exit(0);
}

resetEmailFailures();
