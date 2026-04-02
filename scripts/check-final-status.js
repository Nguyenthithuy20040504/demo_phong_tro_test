const mongoose = require('mongoose');
require('dotenv').config();

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hoadonCollectionName = collections.find(c => c.name.toLowerCase() === 'hoadons')?.name || 'HoaDon';
    const H = db.collection(hoadonCollectionName);

    const now = new Date();
    const query = {
      conLai: { $gt: 0 },
      hanThanhToan: { $lt: now },
      $or: [
        { soLanGuiEmailNhacNoThatBai: { $exists: false } },
        { soLanGuiEmailNhacNoThatBai: { $lt: 3 } }
      ]
    };

    const overdue = await H.find(query).toArray();
    console.log(`Total Overdue Invoices to Process: ${overdue.length}`);
    
    for (const h of overdue) {
        console.log(`- ${h.maHoaDon}: Balance ${h.conLai}, Due ${h.hanThanhToan}, Failures: ${h.soLanGuiEmailNhacNoThatBai || 0}, Email: ${h.khachThueEmail || '?'}`);
        // Let's also check the tenant email from the khachThue field
        if (h.khachThue) {
            const K = db.collection('khachthues'); // Assuming collection name
            const kt = await K.findOne({ _id: h.khachThue });
            if (kt) console.log(`  Tenant Email: ${kt.email}, Name: ${kt.hoTen}`);
        }
    }

    const nam = await H.findOne({ maHoaDon: 'HD20260326572' });
    console.log(`\nStatus of Nam (Daongocnam): Failures=${nam?.soLanGuiEmailNhacNoThatBai}`);

    const nghia = await H.findOne({ maHoaDon: 'HD20260328100' });
    console.log(`Status of Nghia (Vunghia): Due=${nghia?.hanThanhToan}, Failures=${nghia?.soLanGuiEmailNhacNoThatBai}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkStatus();
