// Script chạy 1 lần để sửa trạng thái hóa đơn sai trong database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixInvoiceStatuses() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const HoaDon = mongoose.connection.collection('hoadons');

  // Tìm hóa đơn đánh sai trạng thái "đã thanh toán" nhưng thực tế chưa trả đủ
  const wrongInvoices = await HoaDon.find({
    $or: [
      { trangThai: 'daThanhToan', conLai: { $gt: 0 } },
      { trangThai: 'daThanhToan', tongTien: 0, daThanhToan: 0 },
    ]
  }).toArray();

  console.log(`Found ${wrongInvoices.length} invoices with wrong status`);

  let fixedCount = 0;
  for (const inv of wrongInvoices) {
    const conLai = inv.tongTien - inv.daThanhToan;
    let newStatus;

    if (conLai <= 0 && inv.tongTien > 0) {
      continue; // Actually correctly paid
    } else if (inv.daThanhToan > 0 && conLai > 0) {
      newStatus = 'daThanhToanMotPhan';
    } else {
      // Check overdue
      const now = new Date();
      if (inv.hanThanhToan && new Date(inv.hanThanhToan) < now) {
        newStatus = 'quaHan';
      } else {
        newStatus = 'chuaThanhToan';
      }
    }

    console.log(`Fixing ${inv.maHoaDon}: tongTien=${inv.tongTien}, daThanhToan=${inv.daThanhToan}, conLai=${conLai}, ${inv.trangThai} -> ${newStatus}`);
    
    await HoaDon.updateOne(
      { _id: inv._id },
      { $set: { trangThai: newStatus, conLai: conLai } }
    );
    fixedCount++;
  }

  console.log(`\nDone! Fixed ${fixedCount} invoices.`);
  await mongoose.disconnect();
}

fixInvoiceStatuses().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
