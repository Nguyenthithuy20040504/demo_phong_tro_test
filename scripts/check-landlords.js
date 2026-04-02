const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({
    email: String,
    vaiTro: String,
    caiDatThongBao: {
      tuDongNhacNo: Boolean,
      thoiGianNhacNoEmail: Number,
      ngayGuiThongBaoCuoi: Date
    }
  }, { collection: 'nguoidungs' }));

  const landlords = await NguoiDung.find({ vaiTro: 'chuNha' }).lean();
  console.log('--- Landlord Users ---');
  landlords.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`Settings: ${JSON.stringify(u.caiDatThongBao, null, 2)}`);
  });
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
