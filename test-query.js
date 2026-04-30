require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const HopDong = require('./src/models/HopDong').default;
  const NguoiDung = require('./src/models/NguoiDung').default;
  const ToaNha = require('./src/models/ToaNha').default;
  const Phong = require('./src/models/Phong').default;

  const hds = await HopDong.find({}).populate({
    path: 'phong',
    select: 'maPhong toaNha dienTich giaThue tienCoc giaDien giaNuoc'
  }).sort({ ngayTao: -1 }).limit(2).lean();

  const involvedUserIds = new Set();
  const involvedToaNhaIds = new Set();

  hds.forEach(hd => {
    const bId = hd.phong?.toaNha?._id || hd.phong?.toaNha;
    if (bId) involvedToaNhaIds.add(bId.toString());
  });

  const allToaNhas = await ToaNha.find({ _id: { $in: Array.from(involvedToaNhaIds) } }).lean();
  allToaNhas.forEach(t => {
    if (t.chuSoHuu) involvedUserIds.add(t.chuSoHuu.toString());
  });

  const nds = await NguoiDung.find({ _id: { $in: Array.from(involvedUserIds) } }).lean();
  const userLookup = new Map();
  nds.forEach(u => userLookup.set(u._id.toString(), {hoTen: u.hoTen || u.name, address: u.address, phone: u.phone}));

  const toaNhaLookup = new Map(allToaNhas.map(t => [t._id.toString(), t]));

  hds.forEach(hd => {
    if (hd.phong) {
      const bId = hd.phong.toaNha?._id || hd.phong.toaNha;
      if (bId) {
        const fullToaNha = toaNhaLookup.get(bId.toString());
        const ownerId = fullToaNha.chuSoHuu?.toString();
        if (ownerId) {
          const owner = userLookup.get(ownerId);
          if (owner) {
            fullToaNha.chuSoHuu = { hoTen: owner.hoTen, address: owner.address, phone: owner.phone };
          } else {
            fullToaNha.chuSoHuu = { error: 'owner not found' };
          }
        }
        hd.phong.toaNha = fullToaNha;
      }
    }
  });

  console.log(JSON.stringify(hds.map(hd => hd.phong.toaNha.chuSoHuu), null, 2));
  process.exit(0);
}

test().catch(console.error);
