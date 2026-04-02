const mongoose = require('mongoose');
require('dotenv').config();

async function testInvalidEmailStop() {
  await mongoose.connect(process.env.MONGODB_URI);
  const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({
    maHoaDon: String,
    soLanGuiEmailNhacNoThatBai: Number,
    conLai: Number,
    hanThanhToan: Date,
    khachThue: mongoose.Types.ObjectId
  }, { collection: 'hoadons' }));

  const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({
    email: String,
    vaiTro: String
  }, { collection: 'nguoidungs' }));

  // Find or create a user with invalid email
  let testUser = await NguoiDung.findOne({ email: 'bad-email@invalid' });
  if (!testUser) {
      testUser = await NguoiDung.create({
          email: 'bad-email@invalid',
          vaiTro: 'khachThue',
          hoTen: 'Bad Email User'
      });
  }

  // Create an invoice for this user
  const invoice = await HoaDon.create({
    maHoaDon: 'INVALID_EMAIL_TEST',
    khachThue: testUser._id,
    soLanGuiEmailNhacNoThatBai: 0,
    conLai: 5000,
    hanThanhToan: new Date(Date.now() - 86400000)
  });

  console.log(`Created test invoice ${invoice.maHoaDon} with invalid email.`);
  process.exit(0);
}

testInvalidEmailStop();
