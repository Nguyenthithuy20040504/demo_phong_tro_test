# BÁO CÁO KIẾN TRÚC HỆ THỐNG & MÔI TRƯỜNG PHÁT TRIỂN

> **Đề tài:** Xây dựng hệ thống quản lý phòng trọ SaaS  
> **Học viện Ngân hàng** | Nhóm 14 – K28H/11A  
> **GVHD:** ThS. Chu Văn Huy

---

## 1. Tổng quan kiến trúc hệ thống

Hệ thống quản lý phòng trọ được thiết kế theo kiến trúc **5 tầng (layers)**, tuân thủ mô hình **Multi-Tenant SaaS** với khả năng phân tách dữ liệu theo từng chủ nhà (Tenant). Toàn bộ hệ thống chạy trên nền tảng **Serverless**, giúp tối ưu chi phí vận hành và tự động mở rộng theo nhu cầu.

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│   Trình duyệt Web (PC / Tablet / Mobile)                        │
│   Next.js 15 + React 19 + Tailwind CSS 4                        │
├──────────────────────────────────────────────────────────────────┤
│                         API LAYER                                │
│   Next.js Server Actions & Route Handlers (Serverless)           │
│   TypeScript – Xác thực JWT (NextAuth) – Phân quyền Role-based  │
├──────────────────────────────────────────────────────────────────┤
│                       SERVICE LAYER                              │
│   Email (Nodemailer) │ Telegram Bot │ PayOS (VietQR)             │
│   Google AI (Gemini) │ Facebook Graph API │ Cloudinary            │
├──────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                │
│   MongoDB Atlas – NoSQL Cloud – Tự động sao lưu                 │
│   Phân tách dữ liệu theo Tenant ID (Chủ nhà)                    │
├──────────────────────────────────────────────────────────────────┤
│                       DEPLOY LAYER                               │
│   Vercel Cloud – CI/CD tự động – Serverless Functions            │
│   Global CDN – HTTPS – Vercel Cron Jobs                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Chi tiết từng tầng kiến trúc

### 2.1. Client Layer (Tầng giao diện)

| Thành phần | Công nghệ / Phiên bản | Mô tả |
|---|---|---|
| **Framework** | Next.js 15.5 | Framework React fullstack, hỗ trợ SSR/SSG và App Router |
| **Thư viện UI** | React 19.1 | Thư viện xây dựng giao diện component-based |
| **CSS Framework** | Tailwind CSS 4 | Utility-first CSS, responsive nhanh chóng |
| **UI Components** | Radix UI + shadcn/ui | Hệ thống component accessible, có sẵn: Dialog, Tabs, Select, Toast, Tooltip, Switch, Popover, Dropdown Menu, Avatar, Progress, Scroll Area, Checkbox, Separator... |
| **Biểu đồ** | Recharts 3.2 | Thư viện biểu đồ React cho dashboard thống kê |
| **Animation** | Framer Motion 12 | Thư viện animation cho React |
| **Icon** | Lucide React, Tabler Icons | Bộ icon SVG hiện đại |
| **Form** | React Hook Form + Zod | Xử lý form và validation schema |
| **Data Table** | TanStack Table 8 | Bảng dữ liệu nâng cao (sort, filter, pagination) |
| **Carousel** | Embla Carousel 8 | Hiển thị slide ảnh phòng trọ |
| **Date Picker** | React Day Picker 9 | Chọn ngày cho hợp đồng, hóa đơn |
| **Theme** | next-themes | Hỗ trợ Dark Mode / Light Mode |
| **Fetch** | SWR 2.4 + Axios | Client-side data fetching với caching |
| **Markdown** | React Markdown + remark-gfm | Hiển thị nội dung rich text |
| **Drag & Drop** | @dnd-kit | Kéo thả UI component |

**Nền tảng hỗ trợ:** Trình duyệt Web trên Máy tính, Tablet, Điện thoại (Responsive).

---

### 2.2. API Layer (Tầng xử lý logic)

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **Runtime** | Next.js Route Handlers (Serverless) | API chạy dưới dạng Serverless Functions trên Vercel |
| **Ngôn ngữ** | TypeScript 5 | Ngôn ngữ lập trình type-safe |
| **Xác thực** | NextAuth.js 4.24 + JWT | Xác thực Credentials & Google OAuth 2.0, session JWT |
| **Mã hóa** | bcryptjs 3.0 | Hash mật khẩu người dùng |
| **Token** | jsonwebtoken 9.0 | Tạo và xác minh JWT token |
| **Middleware** | Next.js Middleware | Bảo vệ route `/dashboard/*` và `/api/*` |

**Phân quyền Role-based:**

| Vai trò | Quyền hạn |
|---|---|
| `admin` | Quản trị toàn hệ thống, quản lý chủ nhà, gói dịch vụ SaaS |
| `chuNha` (Landlord) | Quản lý tòa nhà, phòng, khách thuê, hóa đơn, hợp đồng |
| `khachThue` (Tenant) | Xem hóa đơn, thanh toán, báo sự cố |

**Danh sách API Routes chính:**

| Nhóm API | Route | Chức năng |
|---|---|---|
| Xác thực | `/api/auth/*` | Đăng nhập, đăng ký, Google OAuth |
| Tòa nhà | `/api/toa-nha` | CRUD tòa nhà |
| Phòng | `/api/phong` | CRUD phòng trọ |
| Khách thuê | `/api/khach-thue` | Quản lý khách thuê |
| Hợp đồng | `/api/hop-dong` | Quản lý hợp đồng thuê |
| Hóa đơn | `/api/hoa-don` | Tạo, xem, quản lý hóa đơn |
| Thanh toán | `/api/thanh-toan` | Duyệt/từ chối thanh toán |
| Chỉ số điện nước | `/api/chi-so-dien-nuoc` | Ghi chỉ số điện nước hàng tháng |
| Sự cố | `/api/su-co` | Báo cáo và xử lý sự cố |
| Thông báo | `/api/thong-bao` | Hệ thống thông báo real-time |
| Dashboard | `/api/dashboard/stats` | Thống kê tổng quan |
| Báo cáo | `/api/reports` | Xuất báo cáo doanh thu |
| SaaS | `/api/saas/*` | Quản lý gói dịch vụ |
| Admin | `/api/admin/*` | Quản trị hệ thống |
| Upload | `/api/upload` | Upload ảnh lên Cloudinary |
| Facebook | `/api/facebook/post` | Đăng bài lên Facebook Page |
| Telegram | `/api/telegram/*` | Gửi thông báo Telegram |
| Chat AI | `/api/chat/gemini-public` | Chatbot AI hỗ trợ khách thuê |
| Webhook | `/api/webhooks/payos` | Nhận callback thanh toán PayOS |
| Cron Jobs | `/api/cron/*` | Nhắc nợ tự động hàng ngày |

---

### 2.3. Service Layer (Tầng dịch vụ tích hợp)

| Dịch vụ | Công nghệ | File triển khai | Chức năng |
|---|---|---|---|
| **📧 Email** | Nodemailer (SMTP Gmail) | `src/lib/mail.ts` | Gửi hóa đơn, nhắc nợ, xác minh email, thông báo |
| **🤖 Telegram Bot** | Telegraf 4.16 | `src/lib/telegram.ts` | Gửi thông báo Telegram cho chủ nhà |
| **💳 PayOS (VietQR)** | @payos/node 1.0 | `src/lib/payos.ts` | Thanh toán trực tuyến qua QR Code, webhook xác nhận |
| **🧠 Google AI** | Gemini API (REST) | `src/app/api/chat/gemini-public/` | Chatbot AI hỗ trợ tư vấn, AI tạo bài đăng cho thuê |
| **📘 Facebook Graph API** | REST API v19.0 | `src/app/api/facebook/post/` | Đăng bài cho thuê phòng lên Facebook Page kèm ảnh |
| **☁️ Cloudinary** | Cloudinary Upload API | `src/app/api/upload/` | Upload và quản lý ảnh phòng trọ trên cloud |

---

### 2.4. Data Layer (Tầng dữ liệu)

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **Database** | MongoDB Atlas (NoSQL Cloud) | Cơ sở dữ liệu đám mây, tự động sao lưu |
| **ODM** | Mongoose 8.19 | Object Document Mapper cho MongoDB |
| **Kết nối** | `src/lib/mongodb.ts` | Connection pooling, tự động kết nối lại |
| **Multi-Tenant** | Phân tách theo Tenant ID | Mỗi chủ nhà (userId) là 1 tenant riêng biệt |

**Các Model (Collections) chính:**

| Model | File | Mô tả |
|---|---|---|
| `NguoiDung` | `src/models/NguoiDung.ts` | Tài khoản người dùng (Admin, Chủ nhà) |
| `KhachThue` | `src/models/KhachThue.ts` | Thông tin khách thuê |
| `ToaNha` | `src/models/ToaNha.ts` | Tòa nhà / Khu trọ |
| `Phong` | `src/models/Phong.ts` | Phòng trọ |
| `HopDong` | `src/models/HopDong.ts` | Hợp đồng thuê |
| `HoaDon` | `src/models/HoaDon.ts` | Hóa đơn hàng tháng |
| `ThanhToan` | `src/models/ThanhToan.ts` | Lịch sử thanh toán |
| `ChiSoDienNuoc` | `src/models/ChiSoDienNuoc.ts` | Chỉ số điện nước |
| `SuCo` | `src/models/SuCo.ts` | Sự cố / Yêu cầu sửa chữa |
| `ThongBao` | `src/models/ThongBao.ts` | Thông báo hệ thống |
| `GoiDichVu` | `src/models/GoiDichVu.ts` | Gói dịch vụ SaaS (Miễn phí, Cơ bản, Nâng cao) |
| `SaaSPayment` | `src/models/SaaSPayment.ts` | Lịch sử thanh toán gói SaaS |

---

### 2.5. Deploy Layer (Tầng triển khai)

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **Hosting** | Vercel Cloud | Nền tảng triển khai tối ưu cho Next.js |
| **CI/CD** | Vercel Git Integration | Tự động build & deploy khi push code lên Git |
| **Functions** | Vercel Serverless Functions | Mỗi API route chạy như 1 serverless function |
| **CDN** | Vercel Edge Network (Global CDN) | Phân phối nội dung tĩnh toàn cầu, giảm latency |
| **SSL** | HTTPS (tự động) | Chứng chỉ SSL/TLS tự động, mã hóa dữ liệu truyền tải |
| **Cron Jobs** | Vercel Cron | Tác vụ tự động hàng ngày (nhắc nợ email, SMS) |
| **Build** | Turbopack | Công cụ build hiệu năng cao cho Next.js |

**Cấu hình Cron Jobs (`vercel.json`):**

| Cron Job | Schedule | Chức năng |
|---|---|---|
| `/api/cron/hoa-don/nhac-no/email` | Hàng ngày 00:00 UTC | Gửi email nhắc nợ tự động |
| `/api/cron/hoa-don/nhac-no/sms` | Hàng ngày 00:00 UTC | Gửi SMS nhắc nợ tự động |
| `/api/cron/daily-reminder` | Hàng ngày 00:00 UTC | Nhắc nhở tổng hợp hàng ngày |

---

## 3. Luồng xử lý chính

### 3.1. Luồng xác thực (Authentication Flow)

```
Người dùng ──> Trang đăng nhập ──> NextAuth.js
                                       │
                 ┌─────────────────────┤
                 │                     │
          Credentials              Google OAuth
           (Email/MK)              (OAuth 2.0)
                 │                     │
                 └──────────┬──────────┘
                            │
                    Kiểm tra MongoDB
                    (NguoiDung / KhachThue)
                            │
                     Tạo JWT Token
                            │
                   Phân quyền Role-based
                   (admin / chuNha / khachThue)
```

### 3.2. Luồng thanh toán (Payment Flow)

```
Khách thuê ──> Xem hóa đơn ──> Chọn thanh toán PayOS
                                        │
                                  Tạo link VietQR
                                        │
                                 Quét QR thanh toán
                                        │
                              PayOS Webhook callback
                               /api/webhooks/payos
                                        │
                            Cập nhật trạng thái hóa đơn
                                        │
                    Gửi thông báo (Email + Telegram + In-app)
```

### 3.3. Luồng quản lý phòng trọ

```
Chủ nhà ──> Tạo tòa nhà ──> Tạo phòng ──> Thêm khách thuê
                                                │
                                     Tạo hợp đồng thuê
                                                │
                          Ghi chỉ số điện nước hàng tháng
                                                │
                              Tạo hóa đơn (tự động / thủ công)
                                                │
                                   Gửi hóa đơn cho khách
                                   (Email / Telegram / App)
```

---

## 4. Mô hình Multi-Tenant SaaS

```
                    ┌─────────────────────────┐
                    │    ADMIN (Quản trị viên) │
                    │  Quản lý toàn hệ thống  │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
  ┌──────┴──────┐        ┌──────┴──────┐        ┌──────┴──────┐
  │  Chủ nhà A  │        │  Chủ nhà B  │        │  Chủ nhà C  │
  │  (Tenant A) │        │  (Tenant B) │        │  (Tenant C) │
  │  Gói Cơ bản │        │ Gói Nâng cao│        │ Gói Miễn phí│
  └──────┬──────┘        └──────┬──────┘        └──────┬──────┘
         │                       │                       │
    ┌────┴────┐            ┌────┴────┐            ┌────┴────┐
    │ Tòa nhà │            │ Tòa nhà │            │ Tòa nhà │
    │ Phòng   │            │ Phòng   │            │ Phòng   │
    │ Hóa đơn │            │ Hóa đơn │            │ Hóa đơn │
    │ Hợp đồng│            │ Hợp đồng│            │ Hợp đồng│
    └─────────┘            └─────────┘            └─────────┘
```

> **Nguyên tắc:** Dữ liệu của mỗi chủ nhà được **phân tách hoàn toàn** bằng `userId` (Tenant ID). Chủ nhà A không thể truy cập dữ liệu của Chủ nhà B.

---

## 5. Công nghệ & Phiên bản tổng hợp

| Phân loại | Công nghệ | Phiên bản |
|---|---|---|
| Runtime | Node.js | 20.x |
| Framework | Next.js | 15.5 |
| UI Library | React | 19.1 |
| Language | TypeScript | 5.x |
| CSS | Tailwind CSS | 4.x |
| Database | MongoDB (Mongoose) | Atlas Cloud (Mongoose 8.19) |
| Authentication | NextAuth.js (JWT) | 4.24 |
| Payment | PayOS | 1.0 |
| Email | Nodemailer | 6.10 |
| Telegram | Telegraf | 4.16 |
| AI | Google Gemini API | REST API |
| Social | Facebook Graph API | v19.0 |
| Image Storage | Cloudinary | Upload API |
| PDF Export | jsPDF + AutoTable | 3.0 / 5.0 |
| Excel Export | SheetJS (xlsx) | 0.18 |
| Word Export | docx | 9.5 |
| Deployment | Vercel | Cloud (Serverless) |

---

## 6. Bảo mật hệ thống

| Lớp bảo mật | Giải pháp |
|---|---|
| **Mã hóa mật khẩu** | bcryptjs (hash + salt) |
| **Xác thực** | JWT Token (NextAuth.js) với session maxAge 30 ngày |
| **OAuth 2.0** | Google Sign-In |
| **Phân quyền** | Role-based Access Control (RBAC) – 3 vai trò |
| **Middleware** | Next.js Middleware bảo vệ route `/dashboard/*` và `/api/*` |
| **HTTPS** | SSL/TLS tự động qua Vercel |
| **Xác minh Email** | OTP qua email trước khi kích hoạt tài khoản |
| **Khóa tài khoản** | Admin có thể khóa/mở khóa tài khoản real-time |
| **Multi-Tenant** | Phân tách dữ liệu bằng userId, ngăn truy cập trái phép |

---

## 7. Tính năng nổi bật của hệ thống

1. **🏠 Quản lý phòng trọ toàn diện** – Tòa nhà, phòng, khách thuê, hợp đồng, hóa đơn
2. **💳 Thanh toán trực tuyến** – Tích hợp PayOS / VietQR, webhook tự động xác nhận
3. **📧 Thông báo đa kênh** – Email (Nodemailer), Telegram Bot, thông báo trong app
4. **🤖 AI Chatbot** – Tích hợp Google Gemini AI hỗ trợ tư vấn khách thuê
5. **📣 Đăng bài Facebook** – AI tạo nội dung + đăng tự động lên Facebook Page
6. **📊 Dashboard thống kê** – Biểu đồ doanh thu, tỷ lệ lấp đầy, báo cáo chi tiết
7. **📄 Xuất báo cáo** – PDF, Excel, Word
8. **⏰ Tác vụ tự động** – Cron Jobs nhắc nợ, tạo hóa đơn tự động
9. **🌙 Dark Mode** – Giao diện sáng/tối
10. **📱 Responsive** – Tương thích mọi thiết bị
11. **🔐 Multi-Tenant SaaS** – Nhiều chủ nhà dùng chung hệ thống, dữ liệu riêng biệt
12. **💎 Gói dịch vụ** – Miễn phí, Cơ bản, Nâng cao (gia hạn qua PayOS)

---

> *Tài liệu được tạo ngày 30/04/2026*  
> *Hệ thống quản lý phòng trọ SaaS – Nhóm 14 – K28H/11A – Học viện Ngân hàng*
