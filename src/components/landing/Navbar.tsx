"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";

export function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md transition-all duration-300 shadow-sm"
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
          <div className="w-11 h-11 bg-[#14B8A6] rounded-xl flex items-center justify-center text-white font-bold text-2xl transition-transform group-hover:scale-110 shadow-lg shadow-[#14B8A6]/20">
            P
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black font-cinzel text-[#134E4A] tracking-wider uppercase leading-none">
              PIROOM
            </span>
            <span className="text-[10px] font-bold font-josefin text-[#14B8A6] uppercase tracking-[0.15em] mt-1">
              Hệ thống quản lý phòng trọ
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 font-josefin">
          <Link href="#gioi-thieu" className="text-gray-600 hover:text-[#14B8A6] font-bold text-sm uppercase tracking-widest transition-colors">
            Giới thiệu
          </Link>
          <Link href="/bang-gia" className="text-gray-600 hover:text-[#14B8A6] font-bold text-sm uppercase tracking-widest transition-colors">
            Bảng giá
          </Link>
          <Link href="/xem-phong" className="text-gray-600 hover:text-[#14B8A6] font-bold text-sm uppercase tracking-widest transition-colors">
            Xem phòng
          </Link>
          <Link href="#lien-he" className="text-gray-600 hover:text-[#14B8A6] font-bold text-sm uppercase tracking-widest transition-colors">
            Liên hệ
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <Link href="/dang-nhap" className="hidden sm:block text-gray-500 hover:text-[#14B8A6] font-bold text-sm uppercase tracking-widest transition-colors">
            Đăng nhập
          </Link>
          <a 
            href="tel:0326132124" 
            className="flex items-center gap-2.5 bg-[#14B8A6] hover:bg-[#119A8B] text-white px-6 py-2.5 rounded-full shadow-lg shadow-[#14B8A6]/30 transition-all hover:scale-105 active:scale-95"
          >
            <Phone className="h-4 w-4 fill-white" />
            <span className="font-bold font-josefin text-base">0326.132.124</span>
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
