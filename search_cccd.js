const mongoose = require('mongoose');
const mongoUri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false }));
    
    console.log('Searching for User by CCCD 001203054623...');
    const user = await NguoiDung.findOne({ 
      $or: [
        { cccd: '001203054623' },
        { cccd: /001203054623/ }
      ] 
    }).lean();
    console.log(JSON.stringify(user, null, 2));

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
