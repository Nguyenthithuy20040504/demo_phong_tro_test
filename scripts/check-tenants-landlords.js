const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const HoaDon = mongoose.models.HoaDon || mongoose.model('HoaDon', new mongoose.Schema({}, { strict: false, collection: 'hoadons' }));
  const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung', new mongoose.Schema({}, { strict: false, collection: 'nguoidungs' }));
  const KhachThue = mongoose.models.KhachThue || mongoose.model('KhachThue', new mongoose.Schema({}, { strict: false, collection: 'khachthues' }));
  const Phong = mongoose.models.Phong || mongoose.model('Phong', new mongoose.Schema({}, { strict: false, collection: 'phongs' }));
  const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha', new mongoose.Schema({}, { strict: false, collection: 'toanhas' }));

  console.log('--- Checking Tenants ---');
  const query = { $or: [{ email: /vunghia691/i }, { hoTen: /Đào Ngọc Nam/i }, { email: /vungnghia691/i }] };
  const tenants = await KhachThue.find(query).lean();
  
  if (tenants.length === 0) {
      console.log('No tenants found with those names/emails.');
  }

  for (const t of tenants) {
      console.log(`\n[Tenant] ${t.hoTen} (${t.email}), ID: ${t._id}`);
      const invoices = await HoaDon.find({ khachThue: t._id, conLai: { $gt: 0 } }).lean();
      console.log(`  Overdue Invoices: ${invoices.length}`);
      
      for (const inv of invoices) {
          console.log(`  - Invoice: ${inv.maHoaDon}, Balance: ${inv.conLai}`);
          const room = await Phong.findById(inv.phong).lean();
          if (room && room.toaNha) {
              const building = await ToaNha.findById(room.toaNha).lean();
              if (building) {
                  const landlord = await NguoiDung.findById(building.chuSoHuu).lean();
                  console.log(`    Building: ${building.tenToaNha}`);
                  console.log(`    Landlord: ${landlord?.email} (${landlord?.ten || landlord?.name})`);
                  console.log(`    Bank Info: ${JSON.stringify(landlord?.thongTinThanhToan)}`);
                  
                  // Check if QR logic would succeed
                  let bin = landlord?.thongTinThanhToan?.nganHang;
                  let acc = landlord?.thongTinThanhToan?.soTaiKhoan;
                  if (!bin || !acc) {
                      console.log('    QR STATUS: FAILED (Missing Bank/Account)');
                  } else {
                      console.log('    QR STATUS: OK');
                  }
              } else {
                  console.log('    Building data NOT found for room.');
              }
          } else {
              console.log('    Room data NOT found for invoice.');
          }
      }
  }
  process.exit(0);
}

checkData();
