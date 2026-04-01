const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    // Define schema locally to avoid dependency issues with compiled/uncompiled TS
    const HoaDonSchema = new mongoose.Schema({}, { strict: false, collection: 'hoadons' });
    const HoaDon = mongoose.model('HoaDon', HoaDonSchema);

    console.log('Updating all invoices to loaiHoaDon: "thuCong"...');
    
    // Update documents that don't have loaiHoaDon yet
    const result = await HoaDon.updateMany(
      { loaiHoaDon: { $exists: false } },
      { $set: { loaiHoaDon: 'thuCong' } }
    );

    console.log(`Migration completed!`);
    console.log(`- Matched: ${result.matchedCount}`);
    console.log(`- Modified: ${result.modifiedCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

migrate();
