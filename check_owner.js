const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const buildingId = '697c19755f8f9c0422faa5f3';
  
  const ToaNha = mongoose.connection.collection('toanhas');
  const building = await ToaNha.findOne({ _id: new mongoose.Types.ObjectId(buildingId) });
  
  if (building) {
    console.log('Building Owner ID:', building.chuSoHuu);
    const NguoiDung = mongoose.connection.collection('nguoidungs');
    const owner = await NguoiDung.findOne({ _id: building.chuSoHuu });
    if (owner) {
      console.log('Owner Name:', owner.ten || owner.name);
      console.log('Owner Email:', owner.email);
    } else {
      console.log('Owner NOT FOUND');
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);
