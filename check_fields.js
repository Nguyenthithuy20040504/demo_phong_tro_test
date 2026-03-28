require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const phongs = await mongoose.connection.db.collection('phongs').find({ trangThai: 'trong' }).toArray();
  phongs.forEach(p => {
    if (!p.maPhong) console.warn('Missing maPhong for', p._id);
    if (!p.toaNha) console.warn('Missing toaNha for', p._id);
    if (typeof p.giaThue !== 'number') console.warn('giaThue is not a number for', p._id, '| val:', p.giaThue);
    if (p.toaNha && typeof p.toaNha !== 'object') console.warn('toaNha is not an object/ObjectId for', p._id);
  });
  console.log('Tested', phongs.length, 'rooms with trangThai: "trong"');
  process.exit(0);
}

check();
