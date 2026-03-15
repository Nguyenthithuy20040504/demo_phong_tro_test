# Mẫu Kịch bản Kiểm thử (Test Case Template)

**Tên dự án:** Phần mềm Quản lý Phòng trọ Impeccable  
**Người tạo:**   
**Ngày tạo:**   
**Phiên bản:** 1.0

---

## 1. Thông tin chung

* **Mô đun/Tính năng:** [Tên chức năng, VD: Quản lý Phòng, Quản lý Người dùng, Báo cáo thống kê...]
* **Mức độ ưu tiên:** [Cao/Trung bình/Thấp]
* **Môi trường thử nghiệm:** [VD: Chrome 120, Windows 11, iOS 17...]

---

## 2. Danh sách Test Case (Kịch bản kiểm thử)

| ID | Tên Test Case (Mô tả) | Điều kiện tiền đề | Các bước thực hiện (Test Steps) | Kết quả mong đợi (Expected Result) | Thực tế | Pass/Fail | Ghi chú |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **TC-001** | *VD: Đăng nhập thành công với tài khoản Admin* | Đã có sẵn tài khoản Admin, đang ở trang `/login` | 1. Nhập email admin hợp lệ<br>2. Nhập mật khẩu đúng<br>3. Click nút "Đăng nhập" | Hệ thống chuyển hướng vào `/dashboard`. Hiển thị tên người dùng và menu Admin đầy đủ. | | | |
| **TC-002** | *VD: Cảnh báo khi nhập sai mật khẩu* | Đang ở trang `/login` | 1. Nhập email hợp lệ<br>2. Nhập mật khẩu sai<br>3. Click "Đăng nhập" | Hệ thống không chuyển trang. Hiển thị thông báo Toast "Sai email hoặc mật khẩu". | | | |
| **TC-003** | Khởi tạo phòng mới thành công | Đã đăng nhập vai trò Quản lý, đang ở trang Quản lý Phòng | 1. Nhấp nút "Khởi tạo không gian"<br>2. Nhập mã phòng "P999", chọn Tòa nhà có sẵn, giá 2tr<br>3. Nhấn "Triển khai" | Phòng "P999" được tạo thành công, xuất hiện ở đầu ds phòng, có thông báo báo hiệu thành công. | | | |
| **TC-004** | Kiểm tra hiển thị hình ảnh phòng | Đang ở ds phòng, chọn 1 phòng có ảnh | 1. Nhấn nút Xem ảnh (Icon hình ảnh)<br>2. Lướt các ảnh hiển thị trên Carousel | Hệ thống hiển thị Dialog chứa tất cả các ảnh của phòng rõ nét, có thể next/prev ảnh. | | | |
| **TC-005** | ... | ... | ... | ... | | | |

---

## 3. Nhật ký lỗi (Bug Log)

| Bug ID | Tên Lỗi (Tóm tắt) | Test Case | Mô tả chi tiết / Các bước tái hiện | Mức độ | Trạng thái | Hình ảnh minh chứng |
|:---|:---|:---|:---|:---|:---|:---|
| **BUG-001** | *VD: Nút Tạo phòng bị vô hiệu hóa* | TC-003 | Click "Khởi tạo" xong nhưng nút loading cứ quay mãi. | Cao (Blocker) | Đang sửa | `URL hình/video` |
| **BUG-002** | ... | ... | ... | ... | ... | ... |

---
## Hướng dẫn cho Tester (QA):
1. Copy file này cho từng Module hoặc Sprint để dễ quản lý.
2. Với cột trạng thái: Ghi rõ là **Pass** (Đạt), **Fail** (Lỗi), **Blocked** (Bị cản trở không test được), hoặc **N/A** (Không áp dụng).
3. Khi ra một bug mới (kết quả thực tế không khớp với kết quả mong đợi), cập nhật vào bảng "Nhật ký lỗi" ở dưới.
