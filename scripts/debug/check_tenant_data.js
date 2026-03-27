const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const searchTerm = 'khachthue6';
  
  const NguoiDung = mongoose.connection.collection('nguoidungs');
  const KhachThue = mongoose.connection.collection('khachthues');
  const HopDong = mongoose.connection.collection('hopdongs');

  const user = await NguoiDung.findOne({ $or: [{ ten: searchTerm }, { email: searchTerm + '@example.com' }] });
  console.log('\n--- NguoiDung ---');
  console.log(JSON.stringify(user, null, 2));

  if (user) {
    const tenant = await KhachThue.findOne({ $or: [{ hoTen: user.ten }, { soDienThoai: user.soDienThoai }, { _id: user._id }] });
    console.log('\n--- KhachThue ---');
    console.log(JSON.stringify(tenant, null, 2));

    if (tenant) {
        const contracts = await HopDong.find({ khachThueId: tenant._id }).toArray();
        console.log('\n--- HopDong ---');
        console.log(`Found ${contracts.length} contracts.`);
        contracts.forEach(c => console.log(JSON.stringify(c, null, 2)));
    } else {
        // Check by phone number if user has it
        const tenantByPhone = await KhachThue.findOne({ soDienThoai: user.soDienThoai });
        if (tenantByPhone) {
            console.log('\n--- KhachThue (found by phone) ---');
            console.log(JSON.stringify(tenantByPhone, null, 2));
        }
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);
