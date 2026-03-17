const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const HopDong = mongoose.connection.collection('hopdongs');
  const contract = await HopDong.findOne({ maHopDong: 'HD-20260315-IUVG' });
  
  if (contract) {
      console.log(JSON.stringify(contract, null, 2));
      console.log('Current Date:', new Date().toISOString());
  }

  await mongoose.disconnect();
}

check().catch(console.error);
