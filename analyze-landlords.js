const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function analyze() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // 1. Get all landlords
    const landlords = await db.collection('nguoidungs').find({ vaiTro: 'chuNha' }).toArray();
    
    // 2. Get all buildings and their owners
    const buildings = await db.collection('toanhas').find({}).toArray();
    
    // 3. Get all rooms and their buildings
    const rooms = await db.collection('phongs').find({}).toArray();
    
    // 4. Get all active contracts
    const contracts = await db.collection('hopdongs').find({ trangThai: 'hoatDong' }).toArray();

    // Map building to owner
    const buildingToOwner = {};
    buildings.forEach(b => {
      buildingToOwner[b._id.toString()] = b.chuSoHuu.toString();
    });

    // Map room to owner
    const roomToOwner = {};
    rooms.forEach(r => {
      const ownerId = buildingToOwner[r.toaNha.toString()];
      if (ownerId) {
        roomToOwner[r._id.toString()] = ownerId;
      }
    });

    // Aggregate counts
    const landlordMetrics = {}; // { ownerId: { name: "", tenantIds: Set } }
    
    landlords.forEach(l => {
      landlordMetrics[l._id.toString()] = {
        name: l.ten || l.hoTen || l.hoTenLot || 'Chủ trọ',
        email: l.email,
        tenantIds: new Set()
      };
    });

    contracts.forEach(c => {
      const ownerId = roomToOwner[c.phong.toString()];
      if (ownerId && landlordMetrics[ownerId]) {
        // Add representative tenant
        if (c.nguoiDaiDien) {
           landlordMetrics[ownerId].tenantIds.add(c.nguoiDaiDien.toString());
        }
        // Add all tenants in the contract
        if (Array.isArray(c.khachThueId)) {
          c.khachThueId.forEach(tid => {
            landlordMetrics[ownerId].tenantIds.add(tid.toString());
          });
        }
      }
    });

    // Convert to array and sort
    const result = Object.values(landlordMetrics)
      .map(m => ({
        name: m.name,
        email: m.email,
        tenantCount: m.tenantIds.size
      }))
      .sort((a, b) => b.tenantCount - a.tenantCount);

    console.log('--- THỐNG KÊ CHỦ TRỌ VÀ SỐ KHÁCH THUÊ HIỆN TẠI ---');
    console.table(result);
    
    if (result.length > 0) {
      console.log(`\nChủ trọ có nhiều khách nhất là: ${result[0].name} (${result[0].email}) với ${result[0].tenantCount} khách.`);
    } else {
      console.log('\nKhông tìm thấy dữ liệu hợp đồng/khách thuê.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

analyze();
