const mongoose = require('mongoose');

// Define models briefly
const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({
  email: String,
  vaiTro: String,
  role: String
}));

const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha', new mongoose.Schema({
  tenToaNha: String,
  chuSoHuu: mongoose.Schema.Types.ObjectId,
  nguoiQuanLy: [mongoose.Schema.Types.ObjectId]
}));

const Phong = mongoose.models.Phong || mongoose.model('Phong', new mongoose.Schema({
  maPhong: String,
  toaNha: mongoose.Schema.Types.ObjectId,
  trangThai: String
}));

async function debug() {
  try {
    const uri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);
    console.log('Connected');

    const nhanVien = await NguoiDung.findOne({ email: 'nhan_vien1@example.com' });
    if (!nhanVien) {
      console.log('Nhan vien not found');
      return;
    }

    console.log('NhanVien ID:', nhanVien._id, 'Role:', nhanVien.vaiTro || nhanVien.role);

    // Manual check for buildings
    const buildings = await ToaNha.find({
      $or: [
        { chuSoHuu: nhanVien._id },
        { nguoiQuanLy: nhanVien._id }
      ]
    });
    
    console.log('Buildings found for this user:', buildings.map(b => ({ id: b._id, name: b.tenToaNha })));
    
    const buildingIds = buildings.map(b => b._id);
    if (buildingIds.length > 0) {
      const phongs = await Phong.find({ toaNha: { $in: buildingIds } });
      console.log('Rooms found for these buildings:', phongs.length);
      console.log('Room statuses:', phongs.map(p => p.trangThai));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
