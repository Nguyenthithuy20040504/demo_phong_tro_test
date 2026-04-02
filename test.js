const mongoose = require('mongoose');

require('dotenv').config({ path: '.env.local' });

async function doIt() {
  await mongoose.connect(process.env.MONGODB_URI);
  const HopDong = mongoose.connection.collection('hopdongs');
  const count = await HopDong.countDocuments();
  console.log('Total:', count);
  const data = await HopDong.find({}).toArray();
  console.log(data);
  process.exit();
}
doIt();
