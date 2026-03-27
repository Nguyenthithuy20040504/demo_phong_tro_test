# 📋 BÁO CÁO CHI TIẾT HỆ THỐNG API
## Dự án Quản lý Phòng Trọ - PIROOM

> **Tổng số file route**: 55 files  
> **Tổng số endpoints**: 90+ methods  
> **Framework**: Next.js 15 App Router  
> **Database**: MongoDB (Mongoose)  
> **Xác thực**: NextAuth.js + JWT  

---

## 1. XÁC THỰC & ĐĂNG KÝ (Authentication)

### 1.1 `POST /api/auth/[...nextauth]`
- **File**: [route.ts](src/app/api/auth/[...nextauth]/route.ts)
- **Quyền truy cập**: 🌍 Public
- **Mô tả**: Xử lý toàn bộ luồng đăng nhập/đăng xuất NextAuth (Google OAuth, Credentials)
- **Providers**: Google, Credentials (email/password)

### 1.2 `POST /api/auth/register`
- **File**: [route.ts](src/app/api/auth/register/route.ts)
- **Quyền truy cập**: 🌍 Public
- **Mô tả**: Đăng ký tài khoản chủ nhà mới
- **Request Body**:
  ```json
  {
    "ten": "string (min 2)",
    "email": "string (email)",
    "matKhau": "string (min 6)",
    "soDienThoai": "string (10-11 số)",
    "vaiTro": "chuNha"
  }
  ```
- **Validation**: Zod schema, kiểm tra trùng email/SĐT
- **Response**: `201 Created` | `400 Bad Request`

### 1.3 `POST /api/auth/khach-thue/login`
- **File**: [route.ts](src/app/api/auth/khach-thue/login/route.ts)
- **Quyền truy cập**: 🌍 Public
- **Mô tả**: Đăng nhập riêng cho khách thuê bằng SĐT + mật khẩu, trả về JWT token (7 ngày)
- **Request Body**:
  ```json
  {
    "soDienThoai": "string (10-11 số)",
    "matKhau": "string"
  }
  ```
- **Response**: `{ token, khachThue: { _id, hoTen, soDienThoai, email, cccd, trangThai } }`

### 1.4 `GET /api/auth/khach-thue/me`
- **File**: [route.ts](src/app/api/auth/khach-thue/me/route.ts)
- **Quyền truy cập**: 🔒 Khách thuê
- **Mô tả**: Lấy thông tin tổng quan cho dashboard khách thuê
- **Response data**: `{ khachThue, hopDongHienTai, hopDongList, soHoaDonChuaThanhToan, hoaDonGanNhat }`

### 1.5 `PUT /api/auth/khach-thue/me`
- **Quyền truy cập**: 🔒 Khách thuê
- **Mô tả**: Cập nhật thông tin cá nhân hoặc đổi mật khẩu của khách thuê
- **Request Body**: `{ hoTen?, soDienThoai?, anhDaiDien?, matKhauMoi?, matKhauCu? }`

---

## 2. QUẢN LÝ HỒ SƠ NGƯỜI DÙNG (User Profile)

### 2.1 `GET /api/user/profile`
- **File**: [route.ts](src/app/api/user/profile/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Lấy thông tin hồ sơ người dùng hiện tại (qua UserService)

### 2.2 `PUT /api/user/profile`
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Cập nhật hồ sơ người dùng (tên, SĐT, ảnh đại diện, thông tin ngân hàng...)
- **Validation**: Zod `userProfileSchema`

### 2.3 `PUT /api/user/change-password`
- **File**: [route.ts](src/app/api/user/change-password/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Đổi mật khẩu người dùng (cần nhập mật khẩu cũ)
- **Validation**: Zod `changePasswordSchema`

### 2.4 `POST /api/user/bank-lookup`
- **File**: [route.ts](src/app/api/user/bank-lookup/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Tra cứu tên chủ tài khoản ngân hàng qua VietQR API
- **Request Body**: `{ bin: "mã ngân hàng", accountNumber: "số tài khoản" }`
- **Response**: `{ accountName: "tên chủ TK" }`
- **External API**: `https://api.vietqr.io/v2/lookup`

---

## 3. QUẢN LÝ GÓI DỊCH VỤ (Subscription)

### 3.1 `GET /api/user/subscription/status`
- **File**: [route.ts](src/app/api/user/subscription/status/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Kiểm tra trạng thái gói dịch vụ hiện tại của người dùng

### 3.2 `POST /api/user/subscription/extend`
- **File**: [route.ts](src/app/api/user/subscription/extend/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Gia hạn gói dịch vụ

### 3.3 `POST /api/user/subscription/payos/create`
- **File**: [route.ts](src/app/api/user/subscription/payos/create/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Tạo link thanh toán PayOS để gia hạn gói dịch vụ SaaS

### 3.4 `GET /api/user/subscription/payos/verify`
- **File**: [route.ts](src/app/api/user/subscription/payos/verify/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Xác minh trạng thái thanh toán gói dịch vụ qua PayOS

---

## 4. QUẢN LÝ TÒA NHÀ (Buildings)

### 4.1 `GET /api/toa-nha`
- **File**: [route.ts](src/app/api/toa-nha/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin
- **Mô tả**: Danh sách tòa nhà với thống kê chi tiết (số phòng trống/đang thuê/bảo trì, sự cố)
- **Query params**: `page, limit, search`
- **Phân quyền**: Chỉ hiển thị tòa nhà thuộc quyền quản lý (qua `getAccessibleToaNhaIds`)
- **Response bao gồm**: `tongSoPhong, phongTrong, phongDangThue, phongDaDat, phongBaoTri, suCoCount`

### 4.2 `POST /api/toa-nha`
- **Quyền truy cập**: 🔒 Chủ nhà / Admin
- **Mô tả**: Tạo mới tòa nhà, kiểm tra trùng lặp theo tên + địa chỉ
- **Request Body**:
  ```json
  {
    "tenToaNha": "string",
    "diaChi": { "soNha", "duong", "phuong", "quan", "thanhPho" },
    "moTa": "string?",
    "tienNghiChung": ["wifi","camera","baoVe","giuXe","thangMay","sanPhoi","nhaVeSinhChung","khuBepChung"]
  }
  ```

### 4.3 `GET /api/toa-nha/[id]`
- **File**: [route.ts](src/app/api/toa-nha/[id]/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà (kiểm tra quyền `isToaNhaAccessible`)
- **Mô tả**: Chi tiết tòa nhà kèm tổng số phòng thực tế

### 4.4 `PUT /api/toa-nha/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà (kiểm tra quyền)
- **Mô tả**: Cập nhật thông tin tòa nhà (tên, địa chỉ, tiện nghi chung)

### 4.5 `DELETE /api/toa-nha/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà (kiểm tra quyền)
- **Mô tả**: Xóa tòa nhà và tất cả phòng liên quan
- **Ràng buộc**: Không thể xóa nếu còn hợp đồng hoạt động

### 4.6 `GET /api/toa-nha-public`
- **File**: [route.ts](src/app/api/toa-nha-public/route.ts)
- **Quyền truy cập**: 🌍 Public
- **Mô tả**: Danh sách tòa nhà công khai (tên, địa chỉ, mô tả, tiện nghi)
- **Query params**: `page, limit, search`

---

## 5. QUẢN LÝ PHÒNG (Rooms)

### 5.1 `GET /api/phong`
- **File**: [route.ts](src/app/api/phong/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin
- **Mô tả**: Danh sách phòng kèm thông tin hợp đồng hiện tại và khách thuê
- **Query params**: `page, limit, search, toaNha, trangThai`
- **Tính năng đặc biệt**: Tự động cập nhật `trangThai` phòng dựa trên hợp đồng, hỗ trợ polymorphic tenant (KhachThue + NguoiDung)

### 5.2 `POST /api/phong`
- **Quyền truy cập**: 🔒 Chủ nhà (kiểm tra quyền tòa nhà)
- **Mô tả**: Tạo phòng mới với chuẩn hóa tienNghi từ tiếng Việt sang camelCase
- **Request Body**:
  ```json
  {
    "maPhong": "string", "toaNha": "ObjectId", "tang": "number",
    "dienTich": "number", "giaThue": "number", "tienCoc": "number",
    "moTa": "string?", "anhPhong": ["url"]?, "tienNghi": ["string"]?,
    "soNguoiToiDa": "number (1-10)"
  }
  ```
- **Validation**: Kiểm tra trùng mã phòng trong cùng tòa nhà (case-insensitive)

### 5.3 `GET /api/phong/[id]`
- **File**: [route.ts](src/app/api/phong/[id]/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà (kiểm tra quyền qua tòa nhà)
- **Mô tả**: Chi tiết phòng, tự động cập nhật trạng thái trước khi trả về

### 5.4 `PUT /api/phong/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Cập nhật thông tin phòng, có kiểm tra quyền cả tòa nhà cũ và mới nếu chuyển phòng

### 5.5 `DELETE /api/phong/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Xóa phòng

### 5.6 `GET /api/phong-public`
- **File**: [route.ts](src/app/api/phong-public/route.ts)
- **Quyền truy cập**: 🌍 Public
- **Mô tả**: Danh sách phòng **trống** (`trangThai: 'trong'`) với populate thông tin chủ nhà
- **Query params**: `page, limit, search, toaNha`

---

## 6. QUẢN LÝ KHÁCH THUÊ (Tenants)

### 6.1 `GET /api/khach-thue`
- **File**: [route.ts](src/app/api/khach-thue/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin
- **Mô tả**: Danh sách khách thuê kèm hợp đồng hiện tại và lịch sử. Kết hợp dữ liệu từ cả `KhachThue` và `NguoiDung` collections
- **Query params**: `page, limit, search, trangThai`

### 6.2 `POST /api/khach-thue`
- **Quyền truy cập**: 🔒 Chủ nhà / Nhân viên
- **Mô tả**: Tạo hồ sơ khách thuê mới
- **Request Body**:
  ```json
  {
    "hoTen": "string (min 2)", "soDienThoai": "10-11 số",
    "email": "email?", "cccd": "12 số",
    "ngaySinh": "date", "gioiTinh": "nam|nu|khac",
    "queQuan": "string", "ngheNghiep": "string?",
    "anhCCCD": { "matTruoc": "url?", "matSau": "url?" },
    "matKhau": "string (min 6)?"
  }
  ```
- **Validation**: Kiểm tra trùng SĐT/CCCD

### 6.3 `GET /api/khach-thue/[id]`
- **File**: [route.ts](src/app/api/khach-thue/[id]/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin
- **Mô tả**: Chi tiết khách thuê kèm tất cả hợp đồng liên quan

### 6.4 `PUT /api/khach-thue/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Cập nhật hồ sơ khách thuê, đồng bộ mật khẩu giữa KhachThue và NguoiDung

### 6.5 `DELETE /api/khach-thue/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Xóa hồ sơ khách thuê

---

## 7. QUẢN LÝ HỢP ĐỒNG (Contracts)

### 7.1 `GET /api/hop-dong`
- **File**: [route.ts](src/app/api/hop-dong/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin / Khách thuê (chỉ thấy HĐ của mình)
- **Mô tả**: Danh sách hợp đồng với populate phòng, tòa nhà, và khách thuê (polymorphic)
- **Query params**: `page, limit, search, trangThai`

### 7.2 `POST /api/hop-dong`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Tạo hợp đồng thuê phòng mới
- **Request Body**:
  ```json
  {
    "maHopDong": "string", "phong": "ObjectId",
    "khachThueId": ["ObjectId"] (min 1),
    "nguoiDaiDien": "ObjectId (phải nằm trong khachThueId)",
    "ngayBatDau": "date", "ngayKetThuc": "date",
    "giaThue": "number", "tienCoc": "number",
    "chuKyThanhToan": "thang|quy|nam",
    "ngayThanhToan": "number (1-31)",
    "dieuKhoan": "string",
    "giaDien": "number", "giaNuoc": "number",
    "chiSoDienBanDau": "number", "chiSoNuocBanDau": "number",
    "phiDichVu": [{ "ten": "string", "gia": "number" }]?,
    "fileHopDong": "url?"
  }
  ```
- **Validation**: Kiểm tra phòng có HĐ trùng thời gian, tất cả khách thuê phải tồn tại
- **Side effects**: Tự động cập nhật trạng thái phòng và khách thuê

### 7.3 `GET /api/hop-dong/[id]`
- **File**: [route.ts](src/app/api/hop-dong/[id]/route.ts)
- **Quyền truy cập**: 🔒 Kiểm tra quyền qua tòa nhà
- **Mô tả**: Chi tiết hợp đồng với populate đầy đủ

### 7.4 `PUT /api/hop-dong/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Cập nhật hợp đồng (gia hạn ngày kết thúc sẽ tự động chuyển về `hoatDong`)
- **Schema**: Partial update (chỉ cần truyền trường cần sửa)

### 7.5 `DELETE /api/hop-dong/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Xóa hợp đồng, tự động cập nhật trạng thái phòng và khách thuê

---

## 8. HÓA ĐƠN (Invoices)

### 8.1 `GET /api/hoa-don`
- **File**: [route.ts](src/app/api/hoa-don/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin / Khách thuê (chỉ thấy HĐ của mình)
- **Mô tả**: Danh sách hóa đơn, hỗ trợ lấy chi tiết 1 hóa đơn cụ thể (`?id=xxx`)
- **Query params**: `id?, page, limit, hopDongId, trangThai`
- **Tính năng đặc biệt**: Tự động tạo QR VietQR từ thông tin ngân hàng của chủ nhà thực tế

### 8.2 `POST /api/hoa-don`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Tạo hóa đơn tháng mới
- **Request Body**: `{ maHoaDon?, hopDong, thang, nam, tienPhong, chiSoDienBanDau, chiSoDienCuoiKy, chiSoNuocBanDau, chiSoNuocCuoiKy, phiDichVu?, ghiChu?, daThanhToan?, hanThanhToan? }`
- **Tự động**: Tính tiền điện/nước từ chỉ số, tạo mã QR VietQR, gửi thông báo cho khách thuê

### 8.3 `PUT /api/hoa-don`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Cập nhật hóa đơn (chỉ số điện nước, phí dịch vụ, trạng thái)
- **Request Body**: `{ id, maHoaDon, hopDong, thang, nam, tienPhong, chiSoDien*, chiSoNuoc*, phiDichVu, daThanhToan, hanThanhToan, ghiChu }`

### 8.4 `DELETE /api/hoa-don`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Xóa hóa đơn (`?id=xxx`)

### 8.5 `GET /api/hoa-don/form-data`
- **File**: [route.ts](src/app/api/hoa-don/form-data/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Lấy dữ liệu dropdown cho form tạo hóa đơn (danh sách tòa nhà, phòng, hợp đồng hoạt động, khách thuê)

### 8.6 `GET /api/hoa-don/latest-reading`
- **File**: [route.ts](src/app/api/hoa-don/latest-reading/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Lấy chỉ số điện nước cuối kỳ gần nhất cho hợp đồng (để tự động fill vào form tạo hóa đơn)
- **Query params**: `hopDong, thang, nam`

### 8.7 `POST /api/hoa-don/payos/create`
- **File**: [route.ts](src/app/api/hoa-don/payos/create/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Tạo link thanh toán trực tuyến qua cổng PayOS cho hóa đơn
- **Request Body**: `{ hoaDonId }`
- **Response**: `{ checkoutUrl, orderCode }`

### 8.8 `GET /api/hoa-don-public/[id]`
- **File**: [route.ts](src/app/api/hoa-don-public/[id]/route.ts)
- **Quyền truy cập**: 🌍 Public
- **Mô tả**: Xem chi tiết hóa đơn công khai (dùng cho link chia sẻ / QR code)
- **Response**: `{ hoaDon, thanhToanList }`

---

## 9. THANH TOÁN (Payments)

### 9.1 `GET /api/thanh-toan`
- **File**: [route.ts](src/app/api/thanh-toan/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập (phân quyền theo role)
- **Mô tả**: Danh sách thanh toán với populate hóa đơn, phòng, khách thuê
- **Query params**: `page, limit, hopDongId, hoaDonId`
- **Phân quyền**: Khách thuê chỉ thấy biên lai của mình, chủ nhà thấy theo tòa nhà

### 9.2 `POST /api/thanh-toan`
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Ghi nhận thanh toán mới
- **Request Body**: `{ hoaDonId, soTien, phuongThuc, thongTinChuyenKhoan?, ngayThanhToan?, ghiChu?, anhBienLai? }`
- **Phương thức**: `tienMat | chuyenKhoan | viDienTu`
- **Logic**: Khách thuê ghi nhận → trạng thái `choDuyet`; Chủ nhà ghi nhận → `daDuyet` (cập nhật ngay)
- **Side effects**: Tự động gửi thông báo cho khách thuê

### 9.3 `PUT /api/thanh-toan/[id]`
- **File**: [route.ts](src/app/api/thanh-toan/[id]/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Cập nhật thông tin thanh toán

### 9.4 `DELETE /api/thanh-toan/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Xóa bản ghi thanh toán

### 9.5 `PATCH /api/thanh-toan/[id]/duyet`
- **File**: [route.ts](src/app/api/thanh-toan/[id]/duyet/route.ts)
- **Quyền truy cập**: 🔒 Admin / Chủ nhà / Nhân viên
- **Mô tả**: Phê duyệt thanh toán (chuyển từ `choDuyet` → `daDuyet`). Cập nhật `daThanhToan` trên hóa đơn
- **Side effects**: Gửi thông báo cho khách thuê

### 9.6 `PATCH /api/thanh-toan/[id]/tu-choi`
- **File**: [route.ts](src/app/api/thanh-toan/[id]/tu-choi/route.ts)
- **Quyền truy cập**: 🔒 Admin / Chủ nhà / Nhân viên
- **Mô tả**: Từ chối thanh toán (chuyển từ `choDuyet` → `tuChoi`). Khôi phục trạng thái hóa đơn
- **Side effects**: Gửi thông báo cho khách thuê

---

## 10. SỰ CỐ (Incidents)

### 10.1 `GET /api/su-co`
- **File**: [route.ts](src/app/api/su-co/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập (phân quyền)
- **Mô tả**: Danh sách sự cố với lọc theo loại, mức độ, trạng thái
- **Query params**: `page, limit, search, loaiSuCo, mucDoUuTien, trangThai`
- **Loại sự cố**: `dienNuoc | noiThat | vesinh | anNinh | khac`

### 10.2 `POST /api/su-co`
- **Quyền truy cập**: 🔒 Đã đăng nhập (Khách thuê: tự gán phòng từ hợp đồng)
- **Mô tả**: Báo cáo sự cố mới
- **Request Body**: `{ phong, khachThue?, tieuDe, moTa, anhSuCo?, loaiSuCo, mucDoUuTien? }`

### 10.3 `GET /api/su-co/[id]`
- **File**: [route.ts](src/app/api/su-co/[id]/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Chi tiết sự cố

### 10.4 `PUT /api/su-co/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Cập nhật trạng thái xử lý sự cố (`moi → dangXuLy → daXong | daHuy`)

### 10.5 `DELETE /api/su-co/[id]`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Xóa sự cố

---

## 11. THÔNG BÁO (Notifications)

### 11.1 `GET /api/thong-bao`
- **File**: [route.ts](src/app/api/thong-bao/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Danh sách thông báo

### 11.2 `POST /api/thong-bao`
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Gửi thông báo mới đến người dùng

### 11.3 `PUT /api/thong-bao`
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Cập nhật thông báo

### 11.4 `DELETE /api/thong-bao`
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Xóa thông báo

### 11.5 `POST /api/thong-bao/mark-read`
- **File**: [route.ts](src/app/api/thong-bao/mark-read/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Đánh dấu thông báo là đã đọc

### 11.6 `GET /api/thong-bao/my-notifications`
- **File**: [route.ts](src/app/api/thong-bao/my-notifications/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Lấy thông báo dành riêng cho người dùng hiện tại

### 11.7 `GET /api/thong-bao/unread-count`
- **File**: [route.ts](src/app/api/thong-bao/unread-count/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Đếm số thông báo chưa đọc (cho badge icon)

### 11.8 `POST /api/thong-bao/auto-generate`
- **File**: [route.ts](src/app/api/thong-bao/auto-generate/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà
- **Mô tả**: Tự động tạo thông báo hàng loạt (cho hóa đơn, nhắc thanh toán)

### 11.9 `GET /api/notifications`
- **File**: [route.ts](src/app/api/notifications/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: API thông báo bổ sung (endpoint tiếng Anh)

### 11.10 `POST /api/notifications`
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Tạo thông báo (endpoint tiếng Anh)

---

## 12. BÁO CÁO & THỐNG KÊ (Reports & Stats)

### 12.1 `GET /api/dashboard/stats`
- **File**: [route.ts](src/app/api/dashboard/stats/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin
- **Mô tả**: Dữ liệu thống kê tổng quan cho Dashboard (tổng phòng, doanh thu, tỉ lệ lấp đầy)

### 12.2 `GET /api/reports`
- **File**: [route.ts](src/app/api/reports/route.ts)
- **Quyền truy cập**: 🔒 Chủ nhà / Admin
- **Mô tả**: Xuất báo cáo chi tiết doanh thu, tỷ lệ lấp đầy phòng

---

## 13. TIỆN ÍCH (Utilities)

### 13.1 `POST /api/upload`
- **File**: [route.ts](src/app/api/upload/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Upload hình ảnh lên Cloudinary, trả về URL

### 13.2 `GET /api/chi-so-dien-nuoc`
- **File**: [route.ts](src/app/api/chi-so-dien-nuoc/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Quản lý chỉ số điện nước

### 13.3 `GET|PUT /api/chi-so-dien-nuoc/[id]`
- **File**: [route.ts](src/app/api/chi-so-dien-nuoc/[id]/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Chi tiết và cập nhật chỉ số điện nước

### 13.4 `POST /api/auto-invoice`
- **File**: [route.ts](src/app/api/auto-invoice/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Tự động tạo hóa đơn hàng loạt

### 13.5 `POST /api/billing/generate`
- **File**: [route.ts](src/app/api/billing/generate/route.ts)
- **Quyền truy cập**: 🔒 Đã đăng nhập
- **Mô tả**: Tạo hóa đơn theo lô (batch billing)

---

## 14. WEBHOOK

### 14.1 `POST /api/webhooks/payos`
- **File**: [route.ts](src/app/api/webhooks/payos/route.ts)
- **Quyền truy cập**: 🌍 Public (PayOS callback)
- **Mô tả**: Nhận callback từ PayOS khi thanh toán thành công, tự động cập nhật trạng thái hóa đơn

---

## 15. QUẢN TRỊ HỆ THỐNG (Admin SaaS)

### 15.1 `GET /api/admin/users`
- **File**: [route.ts](src/app/api/admin/users/route.ts)
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Danh sách tất cả người dùng trong hệ thống

### 15.2 `POST /api/admin/users`
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Admin tạo tài khoản mới

### 15.3 `PUT /api/admin/users/[id]`
- **File**: [route.ts](src/app/api/admin/users/[id]/route.ts)
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Cập nhật thông tin người dùng

### 15.4 `DELETE /api/admin/users/[id]`
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Xóa tài khoản người dùng

### 15.5 `PATCH /api/admin/users/[id]`
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Cập nhật một phần thông tin (e.g. kích hoạt/vô hiệu hóa tài khoản)

### 15.6 `GET /api/admin/saas/plans`
- **File**: [route.ts](src/app/api/admin/saas/plans/route.ts)
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Danh sách các gói dịch vụ SaaS

### 15.7 `POST /api/admin/saas/plans`
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Tạo gói dịch vụ SaaS mới

### 15.8 `GET /api/admin/saas/stats`
- **File**: [route.ts](src/app/api/admin/saas/stats/route.ts)
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Thống kê tổng quan hệ thống SaaS (tổng user, doanh thu, gói phổ biến)

### 15.9 `GET /api/admin/saas/payments`
- **File**: [route.ts](src/app/api/admin/saas/payments/route.ts)
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Lịch sử thanh toán gói SaaS

### 15.10 `POST /api/admin/saas/payments`
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Ghi nhận thanh toán gói SaaS thủ công

### 15.11 `PATCH /api/admin/saas/payments`
- **Quyền truy cập**: 🔒 Admin
- **Mô tả**: Cập nhật trạng thái thanh toán gói SaaS

---

## 16. API PHÁT TRIỂN & KIỂM TRA (Development)

### 16.1 `GET /api/test-db`
- **File**: [route.ts](src/app/api/test-db/route.ts)
- **Mô tả**: Kiểm tra kết nối MongoDB

### 16.2 `GET /api/test-users`
- **File**: [route.ts](src/app/api/test-users/route.ts)
- **Mô tả**: Liệt kê tất cả người dùng (development only)

### 16.3 `POST /api/seed`
- **File**: [route.ts](src/app/api/seed/route.ts)
- **Mô tả**: Seed dữ liệu mẫu vào database

### 16.4 `GET /api/check-env`
- **File**: [route.ts](src/app/api/check-env/route.ts)
- **Mô tả**: Kiểm tra các biến môi trường đã được cấu hình

---

## 📊 TỔNG KẾT

| Nhóm | Số endpoints | Ghi chú |
|:---|:---:|:---|
| Xác thực & Đăng ký | 6 | NextAuth + JWT cho khách thuê |
| Hồ sơ người dùng | 4 | Profile, đổi mật khẩu, tra cứu ngân hàng |
| Gói dịch vụ (Subscription) | 4 | PayOS integration |
| Tòa nhà | 6 | CRUD + Public API |
| Phòng | 6 | CRUD + Public API, auto-status |
| Khách thuê | 5 | CRUD + polymorphic lookup |
| Hợp đồng | 5 | CRUD + auto-status update |
| Hóa đơn | 8 | CRUD + PayOS + auto-calculate |
| Thanh toán | 6 | CRUD + Duyệt/Từ chối workflow |
| Sự cố | 5 | CRUD + tenant self-report |
| Thông báo | 10 | System + auto-generate |
| Báo cáo | 2 | Dashboard stats + Reports |
| Tiện ích | 5 | Upload, chỉ số điện nước, auto-invoice |
| Webhook | 1 | PayOS callback |
| Admin SaaS | 11 | Users + Plans + Payments + Stats |
| Development | 4 | Test & Seed |
| **TỔNG CỘNG** | **~92** | |

> **Chú giải quyền truy cập**:  
> 🌍 **Public** = Không cần đăng nhập  
> 🔒 **Protected** = Cần đăng nhập (kiểm tra session/token)
