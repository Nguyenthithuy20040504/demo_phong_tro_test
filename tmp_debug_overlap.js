const mongoose = require('mongoose');
const URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix';

const run = async () => {
  await mongoose.connect(URI);
  const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha', new mongoose.Schema({ tenToaNha: String }));
  const Phong = mongoose.models.Phong || mongoose.model('Phong', new mongoose.Schema({ maPhong: String, toaNha: mongoose.Types.ObjectId, trangThai: String }));
  const HopDong = mongoose.models.HopDong || mongoose.model('HopDong', new mongoose.Schema({
    phong: mongoose.Types.ObjectId,
    trangThai: String,
    ngayBatDau: Date,
    ngayKetThuc: Date,
    maHopDong: String
  }));

  const tn = await ToaNha.findOne({ tenToaNha: /West Lake/i });
  if (!tn) { console.log('Building not found'); process.exit(0); }
  
  const p = await Phong.findOne({ toaNha: tn._id, maPhong: '101' });
  if (!p) { console.log('Room 101 not found'); process.exit(0); }
  
  console.log('Room 101 status:', p.trangThai);
  
  const hds = await HopDong.find({ phong: p._id }).lean();
  console.log('Existing contracts:', hds.map(h => ({
    id: h.maHopDong,
    status: h.trangThai,
    start: h.ngayBatDau,
    end: h.ngayKetThuc
  })));
  
  process.exit(0);
};
run();
