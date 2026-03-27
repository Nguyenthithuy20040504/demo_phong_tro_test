
const mongoose = require('mongoose');
const uri = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    await mongoose.connect(uri);
    const user = await mongoose.connection.db.collection('nguoidungs').findOne({ email: 'chu_nha3@example.com' });
    console.log("Email:", user.email, "Vai tro:", user.vaiTro, "Ngay het han:", user.ngayHetHan);
    process.exit(0);
}
run();
