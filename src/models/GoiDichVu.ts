import mongoose, { Schema, Document } from 'mongoose';

export interface IGoiDichVu extends Document {
  ten: string;
  moTa: string;
  gia: number;
  thoiGian: number; // số tháng
  maxPhong: number; // giới hạn số phòng, -1 là không giới hạn
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoiDichVuSchema = new Schema<IGoiDichVu>({
  ten: {
    type: String,
    required: [true, 'Tên gói dịch vụ là bắt buộc'],
    trim: true,
    unique: true
  },
  moTa: {
    type: String,
    required: [true, 'Mô tả gói dịch vụ là bắt buộc']
  },
  gia: {
    type: Number,
    required: [true, 'Giá gói dịch vụ là bắt buộc'],
    min: [0, 'Giá không được nhỏ hơn 0']
  },
  thoiGian: {
    type: Number,
    required: [true, 'Thời gian sử dụng (tháng) là bắt buộc'],
    min: [1, 'Thời gian phải tối thiểu 1 tháng']
  },
  maxPhong: {
    type: Number,
    required: [true, 'Giới hạn số phòng là bắt buộc'],
    default: -1 // -1 means unlimited
  },
  features: [{
    type: String
  }],
  isPopular: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.GoiDichVu || mongoose.model<IGoiDichVu>('GoiDichVu', GoiDichVuSchema);
