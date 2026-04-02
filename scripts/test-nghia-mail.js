const mongoose = require('mongoose');
require('dotenv').config();

// Ensure all models are registered
require('./src/models/NguoiDung');
require('./src/models/ToaNha');
require('./src/models/Phong');
require('./src/models/KhachThue');
require('./src/models/HopDong');
const HoaDon = require('./src/models/HoaDon').default;
const { sendDebtNotificationEmail } = require('./src/lib/mail');
const { getOwnerByHoaDon, getVietQrUrl } = require('./src/lib/payment-utils');

async function testSingle() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const hd = await HoaDon.findOne({ maHoaDon: 'HD20260328100' })
      .populate({
        path: 'phong',
        select: 'toaNha',
        populate: { path: 'toaNha', select: 'chuSoHuu' }
      })
      .populate('hopDong', 'snapshotKhachThue');

    if (!hd) {
        console.error('Invoice HD20260328100 not found');
        process.exit(1);
    }

    const hoaDonData = hd.toObject();
    
    // Resolve owner
    const owner = await getOwnerByHoaDon(hd);
    console.log('Found Owner:', owner?.ten || owner?.name);

    let qrUrl = hoaDonData.checkoutUrl || '';
    if (!qrUrl && owner && owner.thongTinThanhToan) {
        qrUrl = await getVietQrUrl(hd.conLai, hd.maHoaDon, owner.thongTinThanhToan);
    }
    console.log('Generated QR:', qrUrl);

    // Try send
    console.log('--- Attempting to send Email ---');
    const success = await sendDebtNotificationEmail({
      email: 'vunghia691@gmail.com',
      khachThueName: 'Vũ Nghĩa (Test)',
      hoaDonData,
      qrUrl
    });

    console.log('Result Success:', success);

  } catch (error) {
    console.error('CRASH:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testSingle();
