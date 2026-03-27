
const mongoose = require('mongoose');
const uri = "mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    await mongoose.connect(uri);
    const buildings = await mongoose.connection.db.collection('toanhas').find().toArray();
    const owners = new Set(buildings.map(b => b.chuSoHuu ? b.chuSoHuu.toString() : null));
    console.log("Unique Building Owners:", Array.from(owners));
    
    const contracts = await mongoose.connection.db.collection('hopdongs').find().toArray();
    const landlordsInContracts = new Set(contracts.map(c => c.chuNha ? c.chuNha.toString() : null));
    console.log("Landlords in Contracts:", Array.from(landlordsInContracts));
    
    process.exit(0);
}
run();
