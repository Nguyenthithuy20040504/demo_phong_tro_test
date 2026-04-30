const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha', new mongoose.Schema({}, { strict: false }));
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));
    
    const buildings = await ToaNha.find({});
    console.log('Total buildings in DB:', buildings.length);
    
    for (const b of buildings) {
        const ownerId = b.chuSoHuu;
        const owner = await NguoiDung.findById(ownerId);
        console.log(`Building: ${b.tenToaNha}, Owner ID: ${ownerId}, Owner Email: ${owner ? owner.email : 'NOT FOUND'}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
