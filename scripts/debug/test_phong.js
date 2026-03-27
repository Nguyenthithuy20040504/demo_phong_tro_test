const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/demo_phong_tro', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const Phong = require('./src/models/Phong').default;
  const phongList = await Phong.find();
  console.log("Total rooms:", phongList.length);
  
  // Check if there are duplicates in any building
  for (let p of phongList) {
     const dups = await Phong.find({ maPhong: p.maPhong, toaNha: p.toaNha });
     if (dups.length > 1) {
       console.log("FOUND DUPLICATE:", p.maPhong, p.toaNha);
     }
  }

  // Check if there are identical maPhongs across DIFFERENT buildings
  for (let p of phongList) {
     const dups = await Phong.find({ maPhong: p.maPhong });
     if (dups.length > 1 && new Set(dups.map(d => d.toaNha.toString())).size > 1) {
       console.log("FOUND DUPLICATE ACROSS BUILDINGS:", p.maPhong);
     }
  }
  process.exit();
}
test().catch(console.error);
