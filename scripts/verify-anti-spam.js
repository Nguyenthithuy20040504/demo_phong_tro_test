const mongoose = require('mongoose');
require('dotenv').config();

async function verifyAntiSpam() {
  await mongoose.connect(process.env.MONGODB_URI);
  const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({
    maHoaDon: String,
    soLanGuiEmailNhacNoThatBai: Number,
    conLai: Number,
    hanThanhToan: Date
  }, { collection: 'hoadons' }));

  // Create an invoice with 3 failures
  const invoice = await HoaDon.create({
    maHoaDon: 'SPAM_TEST',
    soLanGuiEmailNhacNoThatBai: 3,
    conLai: 1000,
    hanThanhToan: new Date(Date.now() - 86400000) // Yesterday
  });

  console.log(`Created test invoice ${invoice.maHoaDon} with 3 failures.`);
  
  // Now check if it's returned by the same query as the cron
  const found = await HoaDon.find({
    conLai: { $gt: 0 },
    hanThanhToan: { $lt: new Date() },
    $or: [
      { soLanGuiEmailNhacNoThatBai: { $exists: false } },
      { soLanGuiEmailNhacNoThatBai: { $lt: 3 } }
    ]
  });

  const isSkipped = !found.some(f => f.maHoaDon === 'SPAM_TEST');
  console.log(`Verification: Invoice SPAM_TEST skipped by query? ${isSkipped}`);
  
  // Clean up
  await HoaDon.deleteOne({ maHoaDon: 'SPAM_TEST' });
  process.exit(0);
}

verifyAntiSpam();
