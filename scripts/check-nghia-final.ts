import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkNghia() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const db = mongoose.connection.db;
    const h = await db!.collection('hoadons').findOne({ maHoaDon: 'HD20260328100' });
    
    console.log('--- NGHIA STATUS ---');
    console.log(JSON.stringify(h, null, 2));
    
    process.exit(0);
}
checkNghia();
