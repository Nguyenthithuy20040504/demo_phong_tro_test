import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI; 

async function check() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const collections = await mongoose.connection.db!.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const phongs = await mongoose.connection.db!.collection('phongs').find({}).toArray();
    console.log('Total rooms:', phongs.length);
    
    const statusCount: Record<string, number> = {};
    phongs.forEach(p => {
        statusCount[p.trangThai || 'n/a'] = (statusCount[p.trangThai] || 0) + 1;
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
