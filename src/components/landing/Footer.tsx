"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

export function Footer({ showContactInfo = true }: { showContactInfo?: boolean }) {
  return (
    <footer id="lien-he" className="bg-white">
      {/* Contact Info Section (Mona House Style) */}
      {showContactInfo && (
        <div className="container mx-auto px-6 lg:px-12 py-24 text-center">
          <h2 className="text-3xl font-cinzel font-bold text-[#134E4A] mb-4 uppercase tracking-widest">
            THÔNG TIN LIÊN HỆ
          </h2>
          <p className="text-[#134E4A]/60 font-josefin mb-16 text-lg max-w-3xl mx-auto">
            Mọi yêu cầu và hỗ trợ về PiRoom, Quý khách vui lòng liên hệ với chúng tôi qua những cách dưới đây!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            {/* Column 1: Contact Details */}
            <div className="space-y-4 text-center md:text-left">
              <h3 className="text-xl font-bold font-josefin text-[#134E4A] mb-6">Liên hệ</h3>
              <div className="flex flex-col gap-3 text-[#134E4A]/80 font-josefin">
                <div className="flex items-start gap-3 justify-center md:justify-start">
                  <MapPin className="h-5 w-5 text-[#14B8A6] shrink-0" />
                  <span className="text-sm">12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội</span>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <Phone className="h-5 w-5 text-[#14B8A6] shrink-0" />
                  <span className="text-sm">0888.888.888</span>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <Mail className="h-5 w-5 text-[#14B8A6] shrink-0" />
                  <span className="text-sm underline">piroom@gmail.com</span>
                </div>
              </div>
            </div>

            {/* Column 2: Hotline Button */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-bold font-josefin text-[#134E4A] mb-6">Hotline</h3>
              <a 
                href="tel:0888888888" 
                className="w-full bg-[#14B8A6] hover:bg-[#119A8B] text-white py-6 px-4 rounded-xl flex items-center justify-center gap-4 transition-all hover:scale-105 shadow-lg shadow-[#14B8A6]/30 cursor-pointer"
              >
                <Phone className="h-8 w-8" />
                <span className="text-2xl font-bold font-josefin">0888.888.888</span>
              </a>
            </div>

            {/* Column 3: Email Button */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-bold font-josefin text-[#134E4A] mb-6">Gửi email</h3>
              <a 
                href="mailto:piroom@gmail.com" 
                className="w-full bg-[#0369A1] hover:bg-[#025a8a] text-white py-6 px-4 rounded-xl flex items-center justify-center gap-4 transition-all hover:scale-105 shadow-lg shadow-[#0369A1]/30 cursor-pointer"
              >
                <Mail className="h-8 w-8" />
                <span className="text-lg font-bold font-josefin break-all">piroom@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer (Dark Section) */}
      <div className="bg-[#134E4A] text-[#F0FDFA] py-8">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 pb-8 border-b border-white/10 font-josefin">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                <div className="w-10 h-10 bg-[#14B8A6] rounded-xl flex items-center justify-center text-white font-bold text-xl transition-transform group-hover:rotate-12">
                  P
                </div>
                <span className="text-xl font-bold font-cinzel tracking-wider uppercase text-white">
                  PIROOM
                </span>
              </Link>
              <p className="text-sm text-[#F0FDFA]/70 leading-relaxed font-light">
                PiRoom - Giải pháp tối ưu cho mọi nhu cầu quản lý phòng trọ chuyên nghiệp 2026.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-cinzel font-bold text-[#14B8A6] uppercase tracking-widest">
                Tính Năng
              </h4>
              <ul className="space-y-2 text-sm text-[#F0FDFA]/80">
                <li><Link href="/#tinh-nang" className="hover:text-white transition-colors cursor-pointer">Quản lý tòa nhà</Link></li>
                <li><Link href="/xem-phong" className="hover:text-white transition-colors cursor-pointer">Xem phòng mẫu</Link></li>
                <li><Link href="/bang-gia" className="hover:text-white transition-colors cursor-pointer">Bảng giá dịch vụ</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-cinzel font-bold text-[#14B8A6] uppercase tracking-widest">
                Pháp Lý
              </h4>
              <ul className="space-y-2 text-sm text-[#F0FDFA]/80">
                <li><Link href="#" className="hover:text-white transition-colors cursor-pointer">Điều khoản</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors cursor-pointer">Bảo mật</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-cinzel font-bold text-[#14B8A6] uppercase tracking-widest">
                Theo Dõi
              </h4>
              <div className="flex gap-4">
                <div className="p-2 bg-white/5 hover:bg-[#14B8A6] rounded-lg transition-all cursor-pointer">
                  <Facebook size={18} />
                </div>
                <div className="p-2 bg-white/5 hover:bg-[#14B8A6] rounded-lg transition-all cursor-pointer">
                  <Instagram size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer (Light Section for Credit) */}
      <div className="bg-white py-6 border-t border-gray-100">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 font-josefin text-gray-400 text-[10px] tracking-widest uppercase">
            <p>© 2026 PIROOM. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-8">
              <p>DESIGNED BY PIROOM TEAM</p>
              <p>POWERED BY TECH ENGINE</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
