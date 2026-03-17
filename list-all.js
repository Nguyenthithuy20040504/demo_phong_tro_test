const mongoose = require('mongoose');

async function listAll() {
  try {
    const uri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);
    console.log('Connected');

    const db = mongoose.connection.db;
    const toaNhas = await db.collection('toanhas').find({}).toArray();
    console.log('All Buildings:', toaNhas.map(t => ({
      name: t.tenToaNha,
      chuSoHuu: t.chuSoHuu,
      nguoiQuanLy: t.nguoiQuanLy
    })));

    const users = await db.collection('nguoidungs').find({}).toArray();
    console.log('All Users:', users.map(u => ({
      email: u.email,
      id: u._id,
      role: u.role || u.vaiTro
    })));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listAll();
