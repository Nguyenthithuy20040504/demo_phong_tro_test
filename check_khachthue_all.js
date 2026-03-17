const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const NguoiDung = mongoose.connection.collection('nguoidungs');
  const users = await NguoiDung.find({ $or: [{ ten: /khachthue/i }, { email: /khachthue/i }] }).toArray();
  
  console.log(`Found ${users.length} matching users.`);
  users.forEach(u => {
    console.log(`ID: ${u._id}, Name: ${u.ten}, Email: ${u.email}, Role: ${u.role}, Phone: ${u.phone || u.soDienThoai}`);
  });

  const HopDong = mongoose.connection.collection('hopdongs');
  const contracts = await HopDong.find({}).toArray();
  console.log(`\nChecking all contracts for these users...`);
  contracts.forEach(c => {
    c.khachThueId.forEach(tid => {
        const match = users.find(u => u._id.toString() === tid.toString());
        if (match) {
            console.log(`Contract ${c.maHopDong} (ID: ${c._id}) references User ${match.ten} (ID: ${match._id})`);
        }
    });
  });

  await mongoose.disconnect();
}

check().catch(console.error);
