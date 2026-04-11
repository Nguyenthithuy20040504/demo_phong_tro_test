const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const KhachThue = mongoose.connection.collection('khachthues');
  const HoaDon = mongoose.connection.collection('hoadons');
  
  const khach = await KhachThue.findOne({ hoTen: /Đào Ngọc Nam/i });
  if (!khach) {
    console.log("Nam not found");
    process.exit(0);
  }
  
  const hds = await HoaDon.find({ khachThue: khach._id }).toArray();
  console.log(`Found ${hds.length} invoices for Nam`);
  hds.forEach(hd => {
    console.log(`- ID: ${hd._id}, Amount: ${hd.tongTien}, Residual: ${hd.conLai}, Status: ${hd.trangThai}, Due: ${hd.hanThanhToan.toISOString()}`);
  });
  
  console.log("Current system time (ISO):", new Date().toISOString());
  process.exit(0);
}
check();
