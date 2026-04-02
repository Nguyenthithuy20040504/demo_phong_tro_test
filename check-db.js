const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const NguoiDung = mongoose.connection.collection('nguoidungs');
  const ToaNha = mongoose.connection.collection('toanhas');
  const HopDong = mongoose.connection.collection('hopdongs');

  const user = await NguoiDung.findOne({ email: 'thuy1@gmail.com' });
  console.log('User ID:', user._id);

  if (user) {
    const buildings = await ToaNha.find({ 
      $or: [
        { chuSoHuu: user._id }, 
        { nguoiQuanLy: user._id }
      ] 
    }).toArray();
    console.log('Buildings owned/managed by user:', buildings.map(b => ({ _id: b._id, tenToaNha: b.tenToaNha })));
    
    if (buildings.length > 0) {
      const buildingIds = buildings.map(b => b._id);
      const Phong = mongoose.connection.collection('phongs');
      const phongs = await Phong.find({ toaNha: { $in: buildingIds } }).toArray();
      console.log('Phongs found:', phongs.length);
      
      const phongIds = phongs.map(p => p._id);
      const hds = await HopDong.find({ phong: { $in: phongIds } }).toArray();
      console.log('HopDongs for these phongs:', hds.length);
    } else {
        // Find ALL buildings just to see who owns them
        const allBuildings = await ToaNha.find({}).toArray();
        console.log('Total buildings in DB:', allBuildings.length);
        if (allBuildings.length > 0) {
            console.log('First building owner ID:', allBuildings[0].chuSoHuu);
        }
    }
  }
  process.exit();
}
check();
