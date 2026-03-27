require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const NguoiDungSchema = new mongoose.Schema({
  soDienThoai: {
    type: String,
    required: false,
    match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
  }
});
const UserModel = mongoose.model('TestUser', NguoiDungSchema);

async function run() {
  const doc = new UserModel({ soDienThoai: "" });
  const err = doc.validateSync();
  console.log("Validation error:", err);
}
run();
