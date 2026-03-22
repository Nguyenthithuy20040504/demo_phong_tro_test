const mongoose = require('mongoose');

const uri = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Set expiry to exactly 1 month from today (Today is 2026-03-22 -> Expiry 2026-04-22)
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    await db.collection('nguoidungs').updateOne(
        { email: 'chu_nha3@example.com' },
        { 
            $set: { 
                ngayHetHan: expiryDate
            } 
        }
    );
    
    console.log("Updated chu_nha3 expiry date to 1 month from today (approx 22-04-2026).");
    process.exit(0);
}
run();
