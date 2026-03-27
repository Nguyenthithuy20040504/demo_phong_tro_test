
import mongoose from 'mongoose';
import dbConnect from './src/lib/mongodb';
import ToaNha from './src/models/ToaNha';
import Phong from './src/models/Phong';
import HopDong from './src/models/HopDong';
import HoaDon from './src/models/HoaDon';
import NguoiDung from './src/models/NguoiDung';
import KhachThue from './src/models/KhachThue';
import SuCo from './src/models/SuCo';

async function checkAll() {
  await dbConnect();
  
  const results = {
    toaNha: await ToaNha.countDocuments({}),
    phong: await Phong.countDocuments({}),
    hopDong: await HopDong.countDocuments({}),
    hoaDon: await HoaDon.countDocuments({}),
    nguoiDung: await NguoiDung.countDocuments({}),
    khachThue: await KhachThue.countDocuments({}),
    suCo: await SuCo.countDocuments({}),
  };
  
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

checkAll();
