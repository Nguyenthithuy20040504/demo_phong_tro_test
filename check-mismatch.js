const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to:", process.env.MONGODB_URI.split('@')[1] || "local");
  const HoaDon = mongoose.connection.collection('hoadons');
  
  // Search for the specific amount 10.279.000
  const hds = await HoaDon.find({ 
    $or: [
      { tongTien: 10279000 }, 
      { conLai: 10279000 }
    ] 
  }).toArray();
  
  console.log("Found invoices with amount 10,279,000:", hds.length);
  for (let hd of hds) {
    console.log("ID:", hd._id);
    console.log("Due:", hd.hanThanhToan ? hd.hanThanhToan.toISOString() : 'N/A');
    console.log("Status:", hd.trangThai);
    console.log("MaPhong:", hd.phong);
  }
  
  // Also check "now" on this machine
  console.log("Node now:", new Date().toISOString());
  
  process.exit(0);
}
check();
