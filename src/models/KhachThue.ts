import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IKhachThue extends Document {
  hoTen: string;
  tenDangNhap: string; // Thêm tên đăng nhập duy nhất
  soDienThoai: string;
  email?: string;
  cccd: string;
  ngaySinh: Date;
  gioiTinh: 'nam' | 'nu' | 'khac';
  queQuan: string;
  anhCCCD?: {
    matTruoc: string;
    matSau: string;
  };
  ngheNghiep?: string;
  matKhau?: string;
  trangThai: 'dangThue' | 'daTraPhong' | 'chuaThue';
  anhDaiDien?: string;
  avatar?: string;
  ngayTao: Date;
  ngayCapNhat: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  vaiTro: 'khachThue';
  nguoiQuanLy: mongoose.Types.ObjectId;
  toaNhaBanDau?: mongoose.Types.ObjectId;
  
  // Xác minh email
  daXacMinhEmail?: boolean;
  maXacNhanEmail?: string;
  hanMaXacNhanEmail?: Date;
}

const AnhCCCDSchema = new Schema({
  matTruoc: {
    type: String,
    trim: true,
    default: ''
  },
  matSau: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const KhachThueSchema = new Schema<IKhachThue>({
  hoTen: {
    type: String,
    required: [true, 'Họ tên là bắt buộc'],
    trim: true,
    maxlength: [100, 'Họ tên không được quá 100 ký tự']
  },
  tenDangNhap: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự']
  },
  soDienThoai: {
    type: String,
    required: [true, 'Số điện thoại là bắt buộc'],
    match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
  },
  cccd: {
    type: String,
    required: [true, 'CCCD là bắt buộc'],
    match: [/^[0-9]{12}$/, 'CCCD phải có 12 chữ số']
  },
  ngaySinh: {
    type: Date,
    required: [true, 'Ngày sinh là bắt buộc']
  },
  gioiTinh: {
    type: String,
    enum: ['nam', 'nu', 'khac'],
    required: [true, 'Giới tính là bắt buộc']
  },
  queQuan: {
    type: String,
    required: [true, 'Quê quán là bắt buộc'],
    trim: true,
    maxlength: [200, 'Quê quán không được quá 200 ký tự']
  },
  anhCCCD: {
    type: AnhCCCDSchema,
    default: { matTruoc: '', matSau: '' }
  },
  ngheNghiep: {
    type: String,
    trim: true,
    maxlength: [100, 'Nghề nghiệp không được quá 100 ký tự']
  },
  matKhau: {
    type: String,
    select: false, // Không trả về mật khẩu khi query
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  vaiTro:{
    type: String,
    default: 'khachThue'
  },
  trangThai: {
    type: String,
    enum: ['dangThue', 'daTraPhong', 'chuaThue'],
    default: 'chuaThue'
  },
  anhDaiDien: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  nguoiQuanLy: {
    type: Schema.Types.ObjectId,
    ref: 'NguoiDung',
    required: [true, 'Người quản lý (Chủ nhà) là bắt buộc']
  },
  toaNhaBanDau: {
    type: Schema.Types.ObjectId,
    ref: 'ToaNha',
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Các field cho xác minh email
  daXacMinhEmail: {
    type: Boolean,
    default: false
  },
  maXacNhanEmail: {
    type: String,
    default: null
  },
  hanMaXacNhanEmail: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Tự tạo createdAt và updatedAt
});

// Middleware để hash mật khẩu trước khi lưu
KhachThueSchema.pre('save', async function(next) {
  // Chỉ hash mật khẩu nếu nó được modified (hoặc new)
  if (!this.isModified('matKhau') || !this.matKhau) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.matKhau = await bcrypt.hash(this.matKhau, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method để so sánh mật khẩu
KhachThueSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.matKhau) return false;
    return await bcrypt.compare(candidatePassword, this.matKhau);
  } catch (error) {
    return false;
  }
};

// Index cho tìm kiếm
KhachThueSchema.index({ hoTen: 'text', queQuan: 'text', ngheNghiep: 'text', tenDangNhap: 'text' });

// Chỉ mục duy nhất kết hợp: SĐT và CCCD chỉ duy nhất trong phạm vi từng Chủ nhà (nguoiQuanLy)
KhachThueSchema.index({ soDienThoai: 1, nguoiQuanLy: 1 }, { unique: true });
KhachThueSchema.index({ cccd: 1, nguoiQuanLy: 1 }, { unique: true });

// Tên đăng nhập phải duy nhất trên TOÀN HỆ THỐNG và cho phép null (sparse)
KhachThueSchema.index({ tenDangNhap: 1 }, { unique: true, sparse: true });

KhachThueSchema.index({ trangThai: 1 });

// Delete the model if it exists to force schema update
if (mongoose.models && mongoose.models.KhachThue) {
  delete mongoose.models.KhachThue;
}

export default mongoose.model<IKhachThue>('KhachThue', KhachThueSchema);
