import mongoose from 'mongoose';
import ToaNha from './src/models/ToaNha';
import Phong from './src/models/Phong';
import NguoiDung from './src/models/NguoiDung';
import dbConnect from './src/lib/mongodb';
import { getAccessibleToaNhaIds } from './src/lib/auth-utils';

async function debug() {
  try {
    process.env.MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';
    await dbConnect();
    console.log('Connected');

    const nhanVien = await NguoiDung.findOne({ email: 'nhan_vien1@example.com' });
    if (!nhanVien) {
      console.log('Nhan vien not found');
      return;
    }

    const user = {
      id: nhanVien._id.toString(),
      role: 'nhanVien'
    };

    const ids = await getAccessibleToaNhaIds(user);
    console.log('Accessible ToaNha IDs:', ids);

    if (ids && ids.length > 0) {
      const buildings = await ToaNha.find({ _id: { $in: ids } });
      console.log('Buildings:', buildings.map(b => b.tenToaNha));

      const phongs = await Phong.find({ toaNha: { $in: ids } });
      console.log('Total Rooms found for these buildings:', phongs.length);
      
      const counts = await Phong.countDocuments({ toaNha: { $in: ids } });
      console.log('CountDocuments for these buildings:', counts);
    } else {
      console.log('No accessible ToaNha IDs found for this nhanVien');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
