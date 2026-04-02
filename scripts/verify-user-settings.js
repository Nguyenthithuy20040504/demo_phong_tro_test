const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({
    email: String,
    caiDatThongBao: {
      tuDongNhacNo: Boolean,
      thoiGianNhacNoEmail: Number,
      ngayGuiThongBaoCuoi: Date
    }
  }, { collection: 'nguoidungs' }));

  const users = await NguoiDung.find({ 'caiDatThongBao.tuDongNhacNo': true }).lean();
  console.log('--- Users with Auto-Notify Enabled ---');
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`Settings: ${JSON.stringify(u.caiDatThongBao, null, 2)}`);
  });
  process.exit(0);
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
