import mongoose from 'mongoose';
import dbConnect from './src/lib/mongodb';
import HopDong from './src/models/HopDong';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkData() {
    await dbConnect();
    const latestContracts = await HopDong.find().sort({ ngayTao: -1 }).limit(5).lean();
    console.log(JSON.stringify(latestContracts, null, 2));
    process.exit(0);
}

checkData();
