const mongoose = require('mongoose');
const dbConnect = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect('mongodb://localhost:27017/demo_phong_tro');
};

const run = async () => {
  await dbConnect();
  const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', new mongoose.Schema({}));
  const count = await KhachThue.countDocuments();
  const tenants = await KhachThue.find().lean();
  const withAcc = tenants.filter(t => t.matKhau && t.matKhau.length > 5);
  console.log('Total tenants:', count);
  console.log('Tenants with password:', withAcc.length);
  process.exit(0);
};
run();
