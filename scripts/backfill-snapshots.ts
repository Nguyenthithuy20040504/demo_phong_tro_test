/**
 * Script backfill snapshotKhachThue cho tất cả hợp đồng hiện có
 * Chạy: npx tsx scripts/backfill-snapshots.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function main() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  const HopDong = mongoose.connection.collection('hopdongs');
  const KhachThue = mongoose.connection.collection('khachthuees') || mongoose.connection.collection('khachthues');
  const NguoiDung = mongoose.connection.collection('nguoidungs');

  // Tìm tất cả hợp đồng chưa có snapshot
  const contracts = await HopDong.find({
    $or: [
      { snapshotKhachThue: { $exists: false } },
      { snapshotKhachThue: { $size: 0 } },
      { snapshotKhachThue: null }
    ]
  }).toArray();

  console.log(`📋 Found ${contracts.length} contracts without snapshots`);

  let updated = 0;
  for (const hd of contracts) {
    const ktIds = hd.khachThueId || [];
    const nguoiDaiDienId = hd.nguoiDaiDien?.toString();
    const snapshots: any[] = [];

    for (const ktId of ktIds) {
      let hoTen = '';
      let soDienThoai = '';

      // Try KhachThue collection
      // Try different collection names
      const collections = await mongoose.connection.db!.listCollections().toArray();
      const ktCollectionName = collections.find(c => c.name.toLowerCase().includes('khachthue'))?.name;
      
      if (ktCollectionName) {
        const ktDoc = await mongoose.connection.collection(ktCollectionName).findOne({ _id: ktId });
        if (ktDoc) {
          hoTen = (ktDoc as any).hoTen || '';
          soDienThoai = (ktDoc as any).soDienThoai || '';
        }
      }

      // Try NguoiDung collection if not found
      if (!hoTen) {
        const ndCollectionName = collections.find(c => c.name.toLowerCase().includes('nguoidung'))?.name;
        if (ndCollectionName) {
          const ndDoc = await mongoose.connection.collection(ndCollectionName).findOne({ _id: ktId });
          if (ndDoc) {
            hoTen = (ndDoc as any).ten || (ndDoc as any).name || '';
            soDienThoai = (ndDoc as any).soDienThoai || (ndDoc as any).phone || '';
          }
        }
      }

      snapshots.push({
        id: ktId.toString(),
        hoTen: hoTen || '(Không rõ tên)',
        soDienThoai: soDienThoai || '',
        laNoiDaiDien: ktId.toString() === nguoiDaiDienId
      });
    }

    if (snapshots.length > 0) {
      await HopDong.updateOne(
        { _id: hd._id },
        { $set: { snapshotKhachThue: snapshots } }
      );
      updated++;
      console.log(`  ✅ ${hd.maHopDong}: ${snapshots.map(s => s.hoTen).join(', ')}`);
    }
  }

  console.log(`\n🎉 Done! Updated ${updated}/${contracts.length} contracts`);
  await mongoose.disconnect();
}

main().catch(console.error);
