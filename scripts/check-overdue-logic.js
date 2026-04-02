const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({}, { strict: false, collection: 'hoadons' }));
  const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', new mongoose.Schema({}, { strict: false, collection: 'khachthues' }));

  const now = new Date();
  console.log('Current Date/Time:', now);

  const nam = await HoaDon.findOne({ maHoaDon: 'HD20260326572' }).lean();
  const nghia = await HoaDon.findOne({ maHoaDon: 'HD20260328100' }).lean();

  if (nam) {
    console.log(`Nam (HD20260326572): Due Date: ${nam.hanThanhToan}, Overdue: ${nam.hanThanhToan < now}`);
  }
  if (nghia) {
    console.log(`Nghia (HD20260328100): Due Date: ${nghia.hanThanhToan}, Overdue: ${nghia.hanThanhToan < now}`);
  }

  process.exit(0);
}

checkData();
