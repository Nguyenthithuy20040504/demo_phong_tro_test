"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Phone, Menu, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/#gioi-thieu", label: "Giới thiệu" },
    { href: "/bang-gia", label: "Bảng giá" },
    { href: "/xem-phong", label: "Xem phòng" },
    { href: "/#lien-he", label: "Liên hệ" },
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md transition-all duration-300 shadow-sm"
    >
      <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-4 lg:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl transition-transform group-hover:scale-110 shadow-lg shadow-primary/20">
            P
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black font-heading text-secondary tracking-tighter uppercase leading-none">
              PIROOM
            </span>
            <span className="text-[8px] sm:text-[10px] font-bold font-heading text-primary uppercase tracking-[0.1em] mt-0.5 sm:mt-1">
              Quản lý chuyên nghiệp
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 font-heading">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className="text-gray-600 hover:text-primary font-bold text-xs uppercase tracking-widest transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/dang-nhap" className="hidden md:block text-gray-500 hover:text-primary font-bold text-xs uppercase tracking-widest transition-colors font-heading">
            Đăng nhập
          </Link>
          <a 
            href="tel:0888888888" 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
          >
            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white" />
            <span className="font-bold text-sm sm:text-base font-heading">0888.888.888</span>
          </a>

          {/* Mobile Menu Trigger */}
          <button 
            className="lg:hidden p-2 text-secondary hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="container mx-auto px-6 py-8 flex flex-col gap-6 font-heading">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className="text-lg font-bold text-secondary hover:text-primary transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                <Link 
                  href="/dang-nhap" 
                  className="text-lg font-bold text-gray-500"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng nhập
                </Link>
                <Link href="/dang-ky" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-primary h-12 rounded-xl font-bold text-lg">
                    Đăng ký ngay
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
