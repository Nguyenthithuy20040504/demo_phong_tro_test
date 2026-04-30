import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';
import SaasPayment from '@/models/SaaSPayment';

// ────────────────────────────────────────────────────────────────────────────
//  Bảng xếp hạng tier (giá trị càng cao = gói càng tốt)
// ────────────────────────────────────────────────────────────────────────────
const PLAN_TIERS: Record<string, number> = {
  mienPhi: 0,
  coBan: 1,
  chuyenNghiep: 2,
};

// ────────────────────────────────────────────────────────────────────────────
//  Xác định role gói dịch vụ từ tên + giá
//
//  Ưu tiên:
//    1. Tên chứa "chuyên nghiệp" / "vip" / "pro"  → chuyenNghiep
//    2. Tên chứa "cơ bản" / "basic"                → coBan
//    3. Giá > 0 (tất cả gói trả phí còn lại)       → coBan
//    4. Còn lại (giá = 0 / miễn phí)               → mienPhi
// ────────────────────────────────────────────────────────────────────────────
export function getPlanRole(
  planName: string,
  planPrice: number = 0,
): 'mienPhi' | 'coBan' | 'chuyenNghiep' {
  const lower = planName.toLowerCase();

  if (
    lower.includes('chuyên nghiệp') ||
    lower.includes('professional') ||
    lower.includes('vip') ||
    lower.includes('pro')
  ) {
    return 'chuyenNghiep';
  }

  if (lower.includes('cơ bản') || lower.includes('basic')) {
    return 'coBan';
  }

  // Gói trả phí nhưng tên không rõ ràng → mặc định là coBan
  if (planPrice > 0) {
    return 'coBan';
  }

  return 'mienPhi';
}

// ────────────────────────────────────────────────────────────────────────────
//  Kết quả trả về sau khi kích hoạt / gia hạn
// ────────────────────────────────────────────────────────────────────────────
export interface ActivationResult {
  success: boolean;
  newExpiry: Date;
  isQueued: boolean;
  planRole: string;
  /** true nếu hóa đơn đã được xử lý trước đó (idempotent) */
  alreadyProcessed: boolean;
  /** Thông tin user (tên, email) để tạo thông báo */
  userName: string;
  userEmail: string;
  userId: string;
  planName: string;
  planDuration: number;
}

// ────────────────────────────────────────────────────────────────────────────
//  HÀM CHÍNH: Kích hoạt / Gia hạn gói dịch vụ
//
//  Quy tắc tính thời gian:
//    ┌─────────────────────────────────────────────────────────────────────┐
//    │  Trường hợp               │ Hành vi                               │
//    ├───────────────────────────┼───────────────────────────────────────┤
//    │  Gia hạn (cùng gói)      │ Cộng dồn từ ngày hết hạn cũ          │
//    │  Nâng cấp (tier cao hơn) │ Cộng dồn từ ngày hết hạn cũ          │
//    │  Hạ cấp (tier thấp hơn)  │ Xếp hàng đợi, kích hoạt khi hết hạn │
//    │  Gói đã hết hạn          │ Tính từ hôm nay                      │
//    └─────────────────────────────────────────────────────────────────────┘
//
//  Idempotent: Nếu hóa đơn đã xử lý rồi → trả kết quả cũ, KHÔNG tính lại.
// ────────────────────────────────────────────────────────────────────────────
export async function activateSubscription(
  paymentId: string,
): Promise<ActivationResult> {
  // 1. Lấy hóa đơn
  const payment = await SaasPayment.findById(paymentId);
  if (!payment) {
    throw new Error(`SaaSPayment ${paymentId} không tồn tại`);
  }

  // 2. IDEMPOTENCY — đã xử lý rồi thì trả ngay, không tính lại
  if (payment.trangThai === 'daThanhToan' && payment.ngayHetHanMoi) {
    const user = await NguoiDung.findById(payment.chuNha).lean() as any;
    const plan = await GoiDichVu.findById(payment.goiDichVu).lean() as any;
    console.log(
      `[SUBSCRIPTION] ⏭  Payment ${paymentId} already processed → skip. Stored expiry: ${payment.ngayHetHanMoi}`,
    );
    return {
      success: true,
      newExpiry: new Date(payment.ngayHetHanMoi),
      isQueued: false,
      planRole: user?.goiDichVu || 'mienPhi',
      alreadyProcessed: true,
      userName: user?.ten || user?.name || '',
      userEmail: user?.email || '',
      userId: user?._id?.toString() || '',
      planName: plan?.ten || '',
      planDuration: plan?.thoiGian || 1,
    };
  }

  // 3. Lấy gói dịch vụ & người dùng
  const [plan, user] = await Promise.all([
    GoiDichVu.findById(payment.goiDichVu),
    NguoiDung.findById(payment.chuNha),
  ]);
  if (!plan) throw new Error(`GoiDichVu ${payment.goiDichVu} không tồn tại`);
  if (!user) throw new Error(`NguoiDung ${payment.chuNha} không tồn tại`);

  const newPlanRole = getPlanRole(plan.ten, plan.gia);
  const now = new Date();

  // 4. TÍNH NGÀY HẾT HẠN MỚI
  const currentExpiry = user.ngayHetHan ? new Date(user.ngayHetHan) : now;
  const isStillActive = currentExpiry > now;

  //    Nếu gói cũ còn hạn → cộng thêm từ ngày hết hạn cũ (stacking)
  //    Nếu đã hết hạn     → tính từ hôm nay
  const baseDate = isStillActive ? currentExpiry : now;
  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + plan.thoiGian);

  // 5. XÁC ĐỊNH KIỂU THAY ĐỔI
  const currentTier = PLAN_TIERS[user.goiDichVu] ?? 0;
  const newTier = PLAN_TIERS[newPlanRole] ?? 0;

  let isQueued = false;

  if (isStillActive && newTier < currentTier) {
    // ── HẠ CẤP (gói thấp hơn, gói cũ vẫn còn hạn) → hàng đợi ──
    user.goiDichVuTiepTheo = newPlanRole;
    isQueued = true;
    console.log(
      `[SUBSCRIPTION] ↓ Downgrade queued: ${user.goiDichVu} → ${newPlanRole}` +
        ` | user=${user.email}` +
        ` | activates after ${currentExpiry.toISOString()}`,
    );
  } else {
    // ── NÂNG CẤP / GIA HẠN / KÍCH HOẠT MỚI → ngay lập tức ──
    user.goiDichVu = newPlanRole;
    user.goiDichVuId = plan._id;
    user.goiDichVuTiepTheo = null;
    console.log(
      `[SUBSCRIPTION] ✓ Activated ${newPlanRole}` +
        ` | user=${user.email}` +
        ` | base=${baseDate.toISOString()} + ${plan.thoiGian}mo` +
        ` → expiry=${newExpiry.toISOString()}`,
    );
  }

  user.ngayHetHan = newExpiry;
  await user.save();

  // 6. ĐỒNG BỘ NHÂN VIÊN (cùng chủ quản lý)
  await NguoiDung.updateMany(
    {
      nguoiQuanLy: user._id,
      $or: [{ vaiTro: 'nhanVien' }, { role: 'nhanVien' }],
    },
    { $set: { ngayHetHan: newExpiry } },
  );

  // 7. CẬP NHẬT HÓA ĐƠN SAAS
  payment.trangThai = 'daThanhToan';
  payment.ngayHetHanMoi = newExpiry;
  await payment.save();

  return {
    success: true,
    newExpiry,
    isQueued,
    planRole: newPlanRole,
    alreadyProcessed: false,
    userName: user.ten || (user as any).name || '',
    userEmail: user.email || '',
    userId: user._id.toString(),
    planName: plan.ten,
    planDuration: plan.thoiGian,
  };
}
