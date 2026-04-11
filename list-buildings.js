const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ToaNha = mongoose.connection.collection('toanhas');
  const ownerId = new mongoose.Types.ObjectId('69bfc08a22ebb2a166e89cb0');
  const tns = await ToaNha.find({ chuSoHuu: ownerId }).toArray();
  
  for (let t of tns) {
    console.log(`- ${t.tenToaNha} (${t._id})`);
  }
  process.exit(0);
}
check();
