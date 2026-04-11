const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ToaNha = mongoose.connection.collection('toanhas');
  const items = await ToaNha.find({}).project({tenToaNha: 1}).toArray();
  items.forEach(i => console.log(i.tenToaNha));
  process.exit(0);
});
