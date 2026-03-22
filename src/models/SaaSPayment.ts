import mongoose, { Schema, Document } from 'mongoose';

export interface ISaaSPayment extends Document {
  chuNha: mongoose.Types.ObjectId;
  goiDichVu: mongoose.Types.ObjectId;
  maDonHang?: number;
  soTien: number;
  ngayThanhToan: Date;
  trangThai: 'choDuyet' | 'daThanhToan' | 'daHuy';
  phuongThuc: 'tienMat' | 'chuyenKhoan' | 'viDienTu';
  anhBienLai?: string;
  ghiChu?: string;
  ngayHetHanMoi?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaaSPaymentSchema = new Schema<ISaaSPayment>({
  chuNha: {
    type: Schema.Types.ObjectId,
    ref: 'NguoiDung',
    required: [true, 'Chủ nhà là bắt buộc']
  },
  goiDichVu: {
    type: Schema.Types.ObjectId,
    ref: 'GoiDichVu',
    required: [true, 'Gói dịch vụ là bắt buộc']
  },
  maDonHang: {
    type: Number,
    required: false
  },
  soTien: {
    type: Number,
    required: [true, 'Số tiền là bắt buộc'],
    min: [0, 'Số tiền phải lớn hơn 0']
  },
  ngayThanhToan: {
    type: Date,
    required: [true, 'Ngày thanh toán là bắt buộc'],
    default: Date.now
  },
  trangThai: {
    type: String,
    enum: ['choDuyet', 'daThanhToan', 'daHuy'],
    default: 'daThanhToan'
  },
  phuongThuc: {
    type: String,
    enum: ['tienMat', 'chuyenKhoan', 'viDienTu'],
    default: 'chuyenKhoan'
  },
  anhBienLai: {
    type: String,
    default: null
  },
  ghiChu: {
    type: String,
    trim: true
  },
  ngayHetHanMoi: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

export default mongoose.models.SaaSPayment || mongoose.model<ISaaSPayment>('SaaSPayment', SaaSPaymentSchema);
