const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const buildingId = '697c19755f8f9c0422faa5f3';
  
  const ToaNha = mongoose.connection.collection('toanhas');
  const Phong = mongoose.connection.collection('phongs');

  const building = await ToaNha.findOne({ _id: new mongoose.Types.ObjectId(buildingId) });
  if (!building) {
    console.log('Building not found');
  } else {
    console.log('Building found:', building.tenToaNha);
  }

  const rooms = await Phong.find({ toaNha: new mongoose.Types.ObjectId(buildingId) }).toArray();
  console.log(`Found ${rooms.length} rooms for this building.`);
  rooms.forEach(r => {
    console.log('Room Object:', JSON.stringify(r, null, 2));
  });

  await mongoose.disconnect();
}

check().catch(console.error);
