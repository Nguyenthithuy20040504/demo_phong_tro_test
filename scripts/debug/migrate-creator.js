const mongoose = require('mongoose');

const uri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const admin = await db.collection('nguoidungs').findOne({ email: 'demo_dev@example.com' });
    
    if (admin) {
        // Find users that have no nguoiTao and no nguoiQuanLy
        const standaloneUsers = await db.collection('nguoidungs').find({ 
            nguoiTao: { $exists: false }, 
            nguoiQuanLy: null, 
            _id: { $ne: admin._id } 
        }).toArray();

        for (const u of standaloneUsers) {
            await db.collection('nguoidungs').updateOne({ _id: u._id }, { $set: { nguoiTao: admin._id } });
        }
    }
    
    // Find users with nguoiQuanLy
    const managedUsers = await db.collection('nguoidungs').find({ 
        nguoiQuanLy: { $ne: null }, 
        nguoiTao: { $exists: false } 
    }).toArray();

    for (const u of managedUsers) {
        await db.collection('nguoidungs').updateOne({ _id: u._id }, { $set: { nguoiTao: u.nguoiQuanLy } });
    }

    console.log('Migration of nguoiTao complete.');
    process.exit(0);
}

run();
