const mongoose = require('mongoose');
require('dotenv').config();

async function enableAutoNotify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({
    email: String,
    vaiTro: String,
    caiDatThongBao: {
      tuDongNhacNo: Boolean,
      thoiGianNhacNoEmail: Number,
      ngayGuiThongBaoCuoi: Date
    },
    thongTinThanhToan: {
      nganHang: String,
      soTaiKhoan: String,
      chuTaiKhoan: String
    }
  }, { collection: 'nguoidungs' }));

  // Find a chuNha and enable settings
  const landlord = await NguoiDung.findOne({ vaiTro: 'chuNha' });
  if (landlord) {
    landlord.caiDatThongBao = {
      tuDongNhacNo: true,
      thoiGianNhacNoEmail: 1, // 1 minute for testing
      ngayGuiThongBaoCuoi: null
    };
    // Ensure bank info exists for QR test
    if (!landlord.thongTinThanhToan?.nganHang) {
        landlord.thongTinThanhToan = {
            nganHang: 'MB', // Short name for MB Bank
            soTaiKhoan: '0342621021',
            chuTaiKhoan: 'NGUYEN VAN A'
        };
    }
    await landlord.save();
    console.log(`Enabled auto-notify for: ${landlord.email}`);
  } else {
    console.log('No landlord found');
  }
  process.exit(0);
}

enableAutoNotify();
