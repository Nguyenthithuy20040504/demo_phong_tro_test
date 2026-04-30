require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ToaNha = require('./src/models/ToaNha').default;
  const NguoiDung = require('./src/models/NguoiDung').default;

  const toanhas = await ToaNha.find().limit(2).lean();
  let result = [];
  for (const tn of toanhas) {
    const chuId = tn.chuSoHuu;
    let chu = null;
    if (chuId) {
      chu = await NguoiDung.findById(chuId).lean();
    }
    result.push({
      toaNha: tn._id,
      chuSoHuuId: chuId,
      foundChu: !!chu,
      chuDetails: chu
    });
  }
  
  require('fs').writeFileSync('debug-chu-output.json', JSON.stringify(result, null, 2));
  process.exit(0);
}
test().catch(console.error);
