
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://piroot:piroot@cluster0.pdtv6.mongodb.net/demo_phong_tro_test";

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");
        
        const PhongSchema = new mongoose.Schema({
            maPhong: String,
            anhPhong: [String]
        }, { collection: 'phongs' });
        
        const Phong = mongoose.models.Phong || mongoose.model('Phong', PhongSchema);
        
        const result = await Phong.updateOne(
            { maPhong: "101" },
            { $set: { anhPhong: [
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=800"
            ] } }
        );
        
        console.log("Update result:", result);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
