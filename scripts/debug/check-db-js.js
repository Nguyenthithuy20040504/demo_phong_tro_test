
const mongoose = require('mongoose');

const uri = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    await mongoose.connect(uri);
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const coll of collections) {
        const count = await mongoose.connection.db.collection(coll.name).countDocuments();
        console.log(`${coll.name}: ${count}`);
    }
    process.exit(0);
}

run();
