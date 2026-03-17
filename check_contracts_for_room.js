const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const roomId = '69b57cc2f0cf9bf23e8153b2';
  
  const HopDong = mongoose.connection.collection('hopdongs');
  const contracts = await HopDong.find({ phong: new mongoose.Types.ObjectId(roomId) }).toArray();
  
  console.log(`Found ${contracts.length} contracts for room ${roomId}.`);
  contracts.forEach(c => {
    console.log('Contract Object:', JSON.stringify(c, null, 2));
  });

  await mongoose.disconnect();
}

check().catch(console.error);
