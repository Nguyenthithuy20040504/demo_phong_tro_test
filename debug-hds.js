const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const KhachThue = mongoose.connection.collection('khachthues');
  const HoaDon = mongoose.connection.collection('hoadons');
  
  const khach = await KhachThue.findOne({ hoTen: /Đào Ngọc Nam/i });
  const hds = await HoaDon.find({ khachThue: khach._id }).toArray();
  
  for (let hd of hds) {
    if (hd.tongTien === 10279000) {
        console.log(`MATCHED ${hd.tongTien}: Due ${hd.hanThanhToan.toISOString()} Status ${hd.trangThai}`);
    } else {
        console.log(`Other: ${hd.tongTien}: Due ${hd.hanThanhToan.toISOString()} Status ${hd.trangThai}`);
    }
  }
  process.exit(0);
}
check();
