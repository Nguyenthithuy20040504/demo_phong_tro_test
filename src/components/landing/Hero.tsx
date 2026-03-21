"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-[#14B8A6] pt-20 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Text content */}
        <div className="text-white space-y-8 z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold font-josefin leading-tight">
              Chúng tôi là ai
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-4xl md:text-6xl font-black font-cinzel leading-tight uppercase">
              Phần mềm quản lý <br /> 
              độc quyền từ PiRoom
            </h1>
            
            <p className="text-lg md:text-xl font-josefin font-light leading-relaxed max-w-xl opacity-90">
              PiRoom là nền tảng số hóa đột phá, giúp các chủ trọ và nhà quản lý bất động sản tối ưu hóa 100% quy trình vận hành, từ quản lý hợp đồng đến nhắc nợ tự động chỉ trên một màn hình duy nhất. Chúng tôi cam kết mang lại hiệu quả vượt trội cho mô hình kinh doanh của bạn.
            </p>

            <div className="flex flex-col sm:flex-row pt-8">
              <Link href="/dang-ky?vaiTro=chuNha" className="w-full sm:w-auto">
                <Button className="w-full sm:min-w-[450px] bg-white text-[#14B8A6] hover:bg-gray-100 font-black px-12 py-12 rounded-3xl text-2xl md:text-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] font-cinzel transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider group overflow-hidden relative">
                  <span className="relative z-10">Bắt đầu trải nghiệm ngay</span>
                  <ChevronRight className="relative z-10 ml-4 h-8 w-8 transition-transform group-hover:translate-x-2" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Mockup image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-0 flex justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-[700px]">
             {/* Simple geometric decorations behind the mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/10 rounded-full blur-[100px]" />
            <img 
              src="/images/piroom-mockup.png" 
              alt="PiRoom Multi-device Mockup" 
              className="w-full h-auto drop-shadow-2xl relative z-10 select-none"
            />
          </div>
        </motion.div>
      </div>

      {/* Background Graphic (Like the eye-shaped graphic in screenshot) */}
      <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-white/5 opacity-40 z-0">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M100,0 Q50,50 100,100 Z" fill="currentColor" />
          </svg>
      </div>
    </section>
  );
}
