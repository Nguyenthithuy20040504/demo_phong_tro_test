
const mongoose = require('mongoose');
const uri = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    await mongoose.connect(uri);
    const plans = await mongoose.connection.db.collection('goidichvus').find().toArray();
    console.log(JSON.stringify(plans, null, 2));
    process.exit(0);
}
run();
