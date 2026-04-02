import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import Phong from '@/models/Phong';
import KhachThue from '@/models/KhachThue';
import NguoiDung from '@/models/NguoiDung';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await dbConnect();
    
    // Fake query that gets ALL contracts
    const query = {};

    const [hopDongListRaw, total] = await Promise.all([
      HopDong.find(query)
        .populate({
          path: 'phong',
          select: 'maPhong toaNha',
          populate: {
            path: 'toaNha',
            select: 'tenToaNha'
          }
        })
        .sort({ ngayTao: -1 })
        .limit(100)
        .lean(),
      HopDong.countDocuments(query)
    ]);

    const hopDongList = await Promise.all(hopDongListRaw.map(async (hd: any) => {
      const ktIds = hd.khachThueId || [];
      const snapshots = hd.snapshotKhachThue || [];
      const allKt: any[] = [];
      
      for (const ktId of ktIds) {
        let found = await KhachThue.findById(ktId).select('hoTen soDienThoai').lean();
        if (found) { allKt.push(found); continue; }
        const ndUser = await mongoose.model('NguoiDung').findById(ktId).select('ten name soDienThoai phone').lean() as any;
        if (ndUser) {
          allKt.push({ _id: ndUser._id, hoTen: ndUser.ten || ndUser.name, soDienThoai: ndUser.soDienThoai || ndUser.phone });
          continue;
        }
        const snap = snapshots.find((s: any) => s.id === ktId.toString());
        allKt.push({ _id: ktId, hoTen: snap?.hoTen || '(Không có thông tin)', soDienThoai: snap?.soDienThoai || '' });
      }
      
      for (const snap of snapshots) {
        if (!snap.id && snap.hoTen) {
          const alreadyExists = allKt.some(k => k.hoTen === snap.hoTen);
          if (!alreadyExists) {
            allKt.push({ hoTen: snap.hoTen, soDienThoai: snap.soDienThoai || '' });
          }
        }
      }
      
      let nguoiDaiDien = null;
      if (hd.nguoiDaiDien) {
        nguoiDaiDien = await KhachThue.findById(hd.nguoiDaiDien).select('hoTen soDienThoai').lean();
        if (!nguoiDaiDien) {
          const u = await mongoose.model('NguoiDung').findOne({ _id: hd.nguoiDaiDien }).select('ten name soDienThoai phone').lean() as any;
          if (u) {
            nguoiDaiDien = { _id: u._id, hoTen: u.ten || u.name, soDienThoai: u.soDienThoai || u.phone };
          } else {
            const snap = snapshots.find((s: any) => s.id === hd.nguoiDaiDien.toString());
            nguoiDaiDien = { _id: hd.nguoiDaiDien, hoTen: snap?.hoTen || '(Không có thông tin)', soDienThoai: snap?.soDienThoai || '' };
          }
        }
      }
      
      if (!nguoiDaiDien) {
        const daiDienSnap = snapshots.find((s: any) => s.laNoiDaiDien);
        if (daiDienSnap) {
          nguoiDaiDien = { hoTen: daiDienSnap.hoTen, soDienThoai: daiDienSnap.soDienThoai || '' };
        } else if (allKt.length > 0) {
          nguoiDaiDien = allKt[0];
        }
      }

      return { ...hd, khachThueId: allKt, nguoiDaiDien: nguoiDaiDien, snapshotKhachThue: snapshots };
    }));

    return NextResponse.json({
      success: true,
      data: hopDongList,
      pagination: { total }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}
