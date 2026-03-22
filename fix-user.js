const mongoose = require('mongoose');

const uri = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Fix chu_nha3 role and expiry
    await db.collection('nguoidungs').updateOne(
        { email: 'chu_nha3@example.com' },
        { 
            $set: { 
                vaiTro: 'chuNha', 
                role: 'chuNha',
                goiDichVu: 'mienPhi',
                // Set expiry to yesterday to test expiration
                ngayHetHan: new Date(Date.now() - 24 * 60 * 60 * 1000) 
            } 
        }
    );
    
    console.log("Updated chu_nha3 to chuNha with expired date.");
    process.exit(0);
}
run();
