const mongoose = require('mongoose');
require('dotenv').config();

async function createOverdueInvoice() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({}, { strict: false, collection: 'hoadons' }));
  const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false, collection: 'nguoidungs' }));
  const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha', new mongoose.Schema({}, { strict: false, collection: 'toanhas' }));
  const Phong = mongoose.models.Phong || mongoose.model('Phong', new mongoose.Schema({}, { strict: false, collection: 'phongs' }));

  const landlord = await NguoiDung.findOne({ email: 'landlord@example.com' });
  if (!landlord) {
      console.log('Landlord not found');
      process.exit(1);
  }

  // Find a building owned by this landlord
  let building = await ToaNha.findOne({ chuSoHuu: landlord._id });
  if (!building) {
      console.log('Creating test building for landlord...');
      building = await ToaNha.create({
          tenToaNha: 'Test Building',
          chuSoHuu: landlord._id,
          diaChi: 'Test Address'
      });
  }

  // Find a room in this building
  let room = await Phong.findOne({ toaNha: building._id });
  if (!room) {
      console.log('Creating test room for building...');
      room = await Phong.create({
          tenPhong: 'Test Room 101',
          toaNha: building._id,
          loaiPhong: 'Phong Tro',
          giaPhong: 3000000
      });
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Create an overdue invoice
  const hoadon = await HoaDon.create({
      maHoaDon: 'TEST' + Math.floor(Math.random() * 1000),
      phong: room._id,
      khachThue: landlord._id, // Just use the landlord as a test tenant
      thang: now.getMonth() + 1,
      nam: now.getFullYear(),
      tienPhong: 3000000,
      tienDien: 100000,
      tienNuoc: 50000,
      tongTien: 3150000,
      daThanhToan: 0,
      conLai: 3150000,
      trangThai: 'chuaThanhToan',
      hanThanhToan: yesterday,
      ngayTao: now,
      ngayCapNhat: now
  });

  console.log(`Created overdue invoice ${hoadon.maHoaDon} for landlord ${landlord.email}`);
  process.exit(0);
}

createOverdueInvoice();
