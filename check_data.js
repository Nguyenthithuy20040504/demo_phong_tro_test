const mongoose = require('mongoose');

// Manually define schemas to avoid import issues in a quick script
const NguoiDungSchema = new mongoose.Schema({
  tenDangNhap: String,
  soDienThoai: String,
  vaiTro: String
}, { collection: 'nguoidungs' });

const KhachThueSchema = new mongoose.Schema({
  hoTen: String,
  soDienThoai: String,
  trangThai: String
}, { collection: 'khachthues' });

const HopDongSchema = new mongoose.Schema({
  maHopDong: String,
  khachThueId: [mongoose.Schema.Types.ObjectId],
  trangThai: String,
  ngayBatDau: Date,
  ngayKetThuc: Date
}, { collection: 'hopdongs' });

async function checkData() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', NguoiDungSchema);
  const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', KhachThueSchema);
  const HopDong = mongoose.models.HopDong || mongoose.model('HopDong', HopDongSchema);

  const username = 'khachthue6';
  const user = await NguoiDung.findOne({ ten: username }); // The field is 'ten' based on JSON
  
  if (!user) {
    console.log(`User ${username} NOT FOUND in NguoiDung.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`User ${username}: ID=${user._id}, SDT=${user.soDienThoai}, Role=${user.vaiTro}`);

  const ktById = await KhachThue.findById(user._id);
  console.log(`KhachThue by ID ${user._id}: ${ktById ? 'FOUND' : 'NOT FOUND'}`);

  const ktBySDT = await KhachThue.findOne({ soDienThoai: user.soDienThoai });
  console.log(`KhachThue by SDT ${user.soDienThoai}: ${ktBySDT ? 'FOUND (ID=' + ktBySDT._id + ')' : 'NOT FOUND'}`);

  if (ktBySDT) {
    const contracts = await HopDong.find({ khachThueId: ktBySDT._id });
    console.log(`Contracts linked to KhachThue ${ktBySDT._id}: ${contracts.length}`);
    contracts.forEach(c => {
      console.log(` - ${c.maHopDong}: ${c.trangThai}, ${c.ngayBatDau.toLocaleDateString()} to ${c.ngayKetThuc.toLocaleDateString()}`);
    });
  } else {
    console.log("Listing all KhachThue records to find match manually:");
    const allKT = await KhachThue.find({}).lean();
    allKT.forEach(kt => console.log(` - KT: ${kt.hoTen}, SDT: ${kt.soDienThoai}, ID: ${kt._id}`));
    
    console.log("Listing all HopDong records to see linked KhachThue IDs:");
    const allHD = await HopDong.find({}).lean();
    allHD.forEach(hd => console.log(` - HD: ${hd.maHopDong}, KT_IDs: ${JSON.stringify(hd.khachThueId)}`));
  }

  await mongoose.disconnect();
}

checkData().catch(console.error);
