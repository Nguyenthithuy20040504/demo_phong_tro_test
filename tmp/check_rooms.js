const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const buildingId = '697c19755f8f9c0422faa5f3';
  
  // Define Schemas manually if models are not easily importable from here
  const ToaNha = mongoose.model('ToaNha', new mongoose.Schema({}, { strict: false }), 'toanhas');
  const Phong = mongoose.model('Phong', new mongoose.Schema({}, { strict: false }), 'phongs');

  const building = await ToaNha.findById(buildingId);
  if (!building) {
    console.log('Building not found');
  } else {
    console.log('Building found:', building.tenToaNha);
  }

  const rooms = await Phong.find({ toaNha: buildingId });
  console.log(`Found ${rooms.length} rooms for this building.`);
  rooms.forEach(r => console.log(`- Room ID: ${r._id}, Number: ${r.soPhong}`));

  await mongoose.disconnect();
}

check();
