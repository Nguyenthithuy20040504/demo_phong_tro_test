const mongoose = require('mongoose');

async function test() {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Use pure Mongoose to avoid Next.js module resolutions
  const KhachThueSchema = new mongoose.Schema({}, { strict: false });
  const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', KhachThueSchema);
  
  const kt = await KhachThue.find().sort({_id: -1}).limit(2).lean();
  console.log(JSON.stringify(kt, null, 2));
  
  process.exit(0);
}
test();
