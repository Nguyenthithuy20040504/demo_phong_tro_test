import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface INguoiDung extends Document {
  ten: string;
  email: string;
  matKhau: string;
  soDienThoai: string;
  vaiTro: 'admin' | 'chuNha' | 'nhanVien' | 'khachThue';
  anhDaiDien?: string;
  trangThai: 'hoatDong' | 'khoa';
  ngayTao: Date;
  ngayCapNhat: Date;
  // English field names for compatibility
  name: string;
  password: string;
  phone: string;
  role: 'admin' | 'chuNha' | 'nhanVien' | 'khachThue';
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  address?: string;
  nguoiQuanLy?: mongoose.Types.ObjectId;
  goiDichVu: 'mienPhi' | 'coBan' | 'chuyenNghiep';
  ngayHetHan: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const NguoiDungSchema = new Schema<INguoiDung>({
  // Vietnamese fields
  ten: {
    type: String,
    required: [true, 'Tên là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên không được quá 100 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
  },
  matKhau: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  soDienThoai: {
    type: String,
    required: false,
    match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
  },
  vaiTro: {
    type: String,
    enum: ['admin', 'chuNha', 'nhanVien', 'khachThue'],
    default: 'nhanVien'
  },
  anhDaiDien: {
    type: String,
    default: null
  },
  trangThai: {
    type: String,
    enum: ['hoatDong', 'khoa'],
    default: 'hoatDong'
  },
  // English fields for compatibility
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    required: false,
    match: [/^[0-9]{10,11}$/, 'Invalid phone number']
  },
  role: {
    type: String,
    enum: ['admin', 'chuNha', 'nhanVien', 'khachThue'],
    default: 'nhanVien'
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  address: {
    type: String,
    required: false,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  nguoiQuanLy: {
    type: Schema.Types.ObjectId,
    ref: 'NguoiDung',
    default: null
  },
  goiDichVu: {
    type: String,
    enum: ['mienPhi', 'coBan', 'chuyenNghiep'],
    default: 'mienPhi'
  },
  ngayHetHan: {
    type: Date,
    default: null // Will be populated by pre-save hook
  }
}, {
  timestamps: true // Mongoose tự tạo createdAt và updatedAt
});

// Sync ngayTao/ngayCapNhat với createdAt/updatedAt sau khi save
NguoiDungSchema.post('save', function(doc) {
  if (!doc.ngayTao) doc.ngayTao = doc.createdAt;
  if (!doc.ngayCapNhat) doc.ngayCapNhat = doc.updatedAt;
});

// Hash password trước khi lưu
NguoiDungSchema.pre('save', async function(next) {
  if (!this.isModified('matKhau') && !this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    if (this.isModified('matKhau')) {
      this.matKhau = await bcrypt.hash(this.matKhau, salt);
    }
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Sync Vietnamese and English fields
NguoiDungSchema.pre('save', function(next) {
  // Sync name fields
  if (this.isModified('ten') && !this.isModified('name')) {
    this.name = this.ten;
  }
  if (this.isModified('name') && !this.isModified('ten')) {
    this.ten = this.name;
  }
  
  // Sync phone fields
  if (this.isModified('soDienThoai') && !this.isModified('phone')) {
    this.phone = this.soDienThoai;
  }
  if (this.isModified('phone') && !this.isModified('soDienThoai')) {
    this.soDienThoai = this.phone;
  }
  
  // Sync role fields
  if (this.isModified('vaiTro') && !this.isModified('role')) {
    this.role = this.vaiTro;
  }
  if (this.isModified('role') && !this.isModified('vaiTro')) {
    this.vaiTro = this.role;
  }
  
  // Sync avatar fields
  if (this.isModified('anhDaiDien') && !this.isModified('avatar')) {
    this.avatar = this.anhDaiDien;
  }
  if (this.isModified('avatar') && !this.isModified('anhDaiDien')) {
    this.anhDaiDien = this.avatar;
  }
  
  // Sync status fields
  if (this.isModified('trangThai') && !this.isModified('isActive')) {
    this.isActive = this.trangThai === 'hoatDong';
  }
  if (this.isModified('isActive') && !this.isModified('trangThai')) {
    this.trangThai = this.isActive ? 'hoatDong' : 'khoa';
  }
  
  // Logic tính ngày hết hạn (ngayHetHan) khi tạo mới hoặc thay đổi gói/vai trò
  if ((this.isNew || this.isModified('goiDichVu') || this.isModified('vaiTro')) && !this.isModified('ngayHetHan')) {
    const now = new Date();
    
    if (this.vaiTro === 'admin' || this.vaiTro === 'khachThue') {
      // Admin và Khách thuê: Không giới hạn (dùng ngày xa trong tương lai)
      this.ngayHetHan = new Date(2099, 11, 31);
    } else if (this.vaiTro === 'chuNha') {
      // Chủ nhà: Hôm nay + thời hạn gói
      const expiry = new Date();
      if (this.goiDichVu === 'chuyenNghiep') {
        expiry.setMonth(expiry.getMonth() + 6); // Gói Chuyên nghiệp 6 tháng
      } else {
        expiry.setMonth(expiry.getMonth() + 1); // Miễn phí và Cơ bản 1 tháng
      }
      this.ngayHetHan = expiry;
    }
    // Đối với Nhân viên, việc kế thừa ngày hết hạn của Chủ nhà sẽ được xử lý trong pre-save async nếu có nguoiQuanLy
  }

  next();
});

// Hook xử lý async cho Nhân viên (kế thừa ngày của Chủ nhà)
NguoiDungSchema.pre('save', async function(next) {
  if (this.vaiTro === 'nhanVien' && (this.isNew || this.isModified('nguoiQuanLy'))) {
    if (this.nguoiQuanLy) {
      try {
        const chuNha = await mongoose.model('NguoiDung').findById(this.nguoiQuanLy);
        if (chuNha && chuNha.ngayHetHan) {
          this.ngayHetHan = chuNha.ngayHetHan;
        }
      } catch (error) {
        console.error('Error syncing staff expiry date:', error);
      }
    }
  }
  next();
});

// Method để so sánh password
NguoiDungSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const passwordToCheck = this.password || this.matKhau;
  return bcrypt.compare(candidatePassword, passwordToCheck);
};

// Email đã có unique: true nên không cần index thủ công

if (mongoose.models.NguoiDung) {
  delete mongoose.models.NguoiDung;
}
export default mongoose.model<INguoiDung>('NguoiDung', NguoiDungSchema);
