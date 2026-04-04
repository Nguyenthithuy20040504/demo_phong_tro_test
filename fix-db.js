const mongoose = require('mongoose');

async function fix() {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGODB_URI);
  
  const khachThueColl = mongoose.connection.collection('khachthues');
  
  // Update the ones without toaNhaBanDau (the latest ones) and assign them to Thuy Noble West Lake (we need its ID)
  const toaNhaColl = mongoose.connection.collection('toanhas');
  const tn = await toaNhaColl.findOne({ tenToaNha: /Thủy Noble/i });
  
  if (tn) {
    console.log("Found building:", tn._id);
    const res = await khachThueColl.updateMany(
      { toaNhaBanDau: { $exists: false } },
      { $set: { toaNhaBanDau: tn._id } }
    );
    console.log("Updated", res.modifiedCount, "tenants");
  } else {
    console.log("Building not found");
  }
  
  process.exit(0);
}
fix();
