const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const HoaDon = mongoose.connection.collection('hoadons');
  const HopDong = mongoose.connection.collection('hopdongs');
  const Phong = mongoose.connection.collection('phongs');
  const ToaNha = mongoose.connection.collection('toanhas');
  
  const hd = await HoaDon.findOne({ _id: new mongoose.Types.ObjectId('69d0dd7a2a800049024c2fc9') });
  if (!hd) { console.log('HD not found'); process.exit(0); }
  
  const contract = await HopDong.findOne({ _id: hd.hopDong });
  if (contract) {
    console.log("Contract room ID:", contract.phong);
    const room = await Phong.findOne({ _id: contract.phong });
    if (room) {
        console.log("Room building ID:", room.toaNha);
        const building = await ToaNha.findOne({ _id: room.toaNha });
        if (building) {
            console.log("Building Name:", building.tenToaNha);
            console.log("Building Owner:", building.chuSoHuu);
        }
    }
  }
  process.exit(0);
}
check();
