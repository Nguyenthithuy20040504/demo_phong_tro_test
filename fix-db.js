require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ToaNha = require('./src/models/ToaNha').default;
  const NguoiDung = require('./src/models/NguoiDung').default;

  const admin = await NguoiDung.findOne({vaiTro: 'admin'}).lean();
  if (!admin) { console.log('no admin'); process.exit(1); }

  const toanhas = await ToaNha.find({}).lean();
  let updated = 0;
  for (const tn of toanhas) {
    const chu = await NguoiDung.findById(tn.chuSoHuu).lean();
    if (!chu) {
       await ToaNha.updateOne({_id: tn._id}, { $set: { chuSoHuu: admin._id } });
       updated++;
    }
  }
  
  console.log(`Updated ${updated} buildings to admin.`);
  process.exit(0);
}
fix().catch(console.error);
