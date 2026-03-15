import dbConnect from './src/lib/mongodb';
import NguoiDung from './src/models/NguoiDung';
import KhachThue from './src/models/KhachThue';
import HopDong from './src/models/HopDong';
import mongoose from 'mongoose';

async function checkTenantData(username: string) {
  await dbConnect();
  console.log(`Checking data for user: ${username}`);
  
  const user = await NguoiDung.findOne({ tenDangNhap: username });
  if (!user) {
    console.log(`User ${username} not found in NguoiDung`);
    return;
  }
  
  console.log(`User found: ID=${user._id}, SDT=${user.soDienThoai}, Role=${user.vaiTro}`);
  
  const khachThueById = await KhachThue.findById(user._id);
  console.log(`KhachThue by ID: ${khachThueById ? 'FOUND' : 'NOT FOUND'}`);
  
  const khachThueBySDT = await KhachThue.findOne({ soDienThoai: user.soDienThoai });
  console.log(`KhachThue by SDT: ${khachThueBySDT ? 'FOUND (ID=' + khachThueBySDT._id + ')' : 'NOT FOUND'}`);
  
  if (khachThueBySDT) {
    const contracts = await HopDong.find({ khachThueId: khachThueBySDT._id });
    console.log(`Contracts for KhachThue (by SDT match): ${contracts.length}`);
    contracts.forEach(c => {
      console.log(` - Contract: ${c.maHopDong}, Status: ${c.trangThai}, Start: ${c.ngayBatDau}, End: ${c.ngayKetThuc}`);
    });
  }

  process.exit(0);
}

checkTenantData('khach_thue6');
