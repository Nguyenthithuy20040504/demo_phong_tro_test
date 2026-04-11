const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
console.log(process.env.MONGODB_URI);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  const KhachThue = mongoose.connection.collection('khachthues');
  const HoaDon = mongoose.connection.collection('hoadons');
  
  const khachs = await KhachThue.find({ hoTen: /Đào Ngọc Nam/i }).toArray();
  console.log("Found KhachThue named Nam:", khachs);
  
  if (khachs.length > 0) {
    const hds = await HoaDon.find({ khachThue: khachs[0]._id }).toArray();
    console.log("Found HoaDons for him:", hds.length);
    for (let hd of hds) {
      console.log("Status:", hd.trangThai, "Due:", hd.hanThanhToan, "HopDong:", hd.hopDong);
    }
  }
  process.exit(0);
}
check();
