require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const phongs = await mongoose.connection.db.collection('phongs').find({ trangThai: 'trong' }).toArray();
  const toaNhaIds = [...new Set(phongs.map(p => p.toaNha ? p.toaNha.toString() : 'null'))];
  const existingBuildings = await mongoose.connection.db.collection('toanhas').find({ _id: { $in: toaNhaIds.filter(id => id !== 'null').map(id => new mongoose.Types.ObjectId(id)) } }).toArray();

  console.log('Rooms with trangThai: "trong":', phongs.length);
  console.log('Unique building IDs in these rooms:', toaNhaIds.length);
  console.log('Existing buildings found for these rooms:', existingBuildings.length);

  if (phongs.length > existingBuildings.length) {
      console.log('WARNING: Some rooms reference non-existent buildings!');
  }

  process.exit(0);
}

check();
