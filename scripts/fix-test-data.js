const mongoose = require('mongoose');
require('dotenv').config();

async function runFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hoadonCollectionName = collections.find(c => c.name.toLowerCase() === 'hoadons')?.name || 'HoaDon';
    const H = db.collection(hoadonCollectionName);

    console.log('--- 1. Fixing Nghia\'s Invoice (HD20260328100) for Test ---');
    const updateNghia = await H.updateOne(
      { maHoaDon: 'HD20260328100' },
      { 
        $set: { 
          hanThanhToan: new Date('2026-03-01T07:00:00Z'),
          soLanGuiEmailNhacNoThatBai: 0,
          ngayGuiEmailNhacNoCuoi: null 
        } 
      }
    );
    console.log('Update Nghia Result:', JSON.stringify(updateNghia));

    console.log('\n--- 2. Fixing Nam\'s Invoice (HD20260326572) to stop spam ---');
    // We set it to 3 failures so the Cron Job will skip it immediately
    const updateNam = await H.updateOne(
      { maHoaDon: 'HD20260326572' },
      { $set: { soLanGuiEmailNhacNoThatBai: 3 } }
    );
    console.log('Update Nam Result:', JSON.stringify(updateNam));

    console.log('\n--- 3. Verifying Results ---');
    const nghia = await H.findOne({ maHoaDon: 'HD20260328100' });
    const nam = await H.findOne({ maHoaDon: 'HD20260326572' });
    
    console.log(`Nghia Due Date: ${nghia?.hanThanhToan} (Overdue: ${nghia?.hanThanhToan < new Date()})`);
    console.log(`Nam Failures: ${nam?.soLanGuiEmailNhacNoThatBai} (Should be >= 3 to stop spam)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runFix();
