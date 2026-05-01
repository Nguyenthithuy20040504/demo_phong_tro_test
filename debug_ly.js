const mongoose = require('mongoose');
const mongoUri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', new mongoose.Schema({}, { strict: false }));
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));
    
    console.log('Searching for Ly in KhachThue...');
    const kts = await KhachThue.find({ hoTen: /Ly/i }).lean();
    console.log(JSON.stringify(kts, null, 2));
    
    console.log('Searching for Ly in NguoiDung...');
    const nds = await NguoiDung.find({ 
      $or: [
        { ten: /Ly/i }, 
        { name: /Ly/i },
        { tenDangNhap: /Ly/i },
        { username: /Ly/i },
        { email: /Ly/i }
      ] 
    }).lean();
    console.log(JSON.stringify(nds, null, 2));

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
