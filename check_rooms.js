require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Guess model names: 'phongs', 'toanhas'
    const phongs = await mongoose.connection.db.collection('phongs').find({}).toArray();
    console.log('Total rooms:', phongs.length);
    
    const statusCount = {};
    phongs.forEach(p => {
        const s = p.trangThai || 'n/a';
        statusCount[s] = (statusCount[s] || 0) + 1;
    });
    console.log('Status counts:', statusCount);

    if (phongs.length > 0) {
        console.log('Sample room:', JSON.stringify(phongs[0], null, 2));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

check();
