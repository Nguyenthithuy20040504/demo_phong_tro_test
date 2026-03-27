const mongoose = require('mongoose');

async function check() {
  const MONGODB_URI = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const HopDong = mongoose.connection.collection('hopdongs');
  const KhachThue = mongoose.connection.collection('khachthues');

  const contracts = await HopDong.find({}).toArray();
  console.log(`\nFound ${contracts.length} contracts.`);

  for (const c of contracts) {
    console.log(`\nContract: ${c.maHopDong}`);
    console.log(`Tenant IDs: ${JSON.stringify(c.khachThueId)}`);
    
    for (const tid of c.khachThueId) {
        const tenant = await KhachThue.findOne({ _id: tid });
        if (tenant) {
            console.log(`  - Tenant: ${tenant.hoTen} (${tenant.soDienThoai})`);
        } else {
            console.log(`  - Tenant ID ${tid} NOT FOUND in KhachThue collection.`);
            // check NguoiDung too just in case
            const user = await mongoose.connection.collection('nguoidungs').findOne({ _id: tid });
            if (user) {
                console.log(`  - Tenant ID ${tid} FOUND in NguoiDung collection as ${user.ten}.`);
            }
        }
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);
