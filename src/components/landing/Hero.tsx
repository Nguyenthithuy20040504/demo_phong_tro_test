"use client";

import { motion } from "framer-motion";
import { ChevronRight, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section id="gioi-thieu" className="relative min-h-[70vh] md:min-h-[85vh] lg:min-h-screen flex items-center bg-primary pt-24 pb-12 overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center relative z-10">
        {/* Left Side: Text content */}
        <div className="text-white space-y-6 md:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-heading leading-tight opacity-90">
              Chúng tôi là ai
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4 md:space-y-6"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black font-heading leading-tight uppercase tracking-tight">
              Phần mềm quản lý <br className="hidden sm:block" /> 
              đặc quyền từ PiRoom
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-medium leading-relaxed max-w-xl opacity-80">
              PiRoom là nền tảng số hóa đột phá, giúp các chủ trọ và nhà quản lý bất động sản tối ưu hóa 100% quy trình vận hành, từ quản lý hợp đồng đến nhắc nợ tự động chỉ trên một màn hình duy nhất.
            </p>

            <div className="flex flex-col sm:flex-row pt-4 md:pt-8 gap-4">
              <Link href="/dang-ky?vaiTro=chuNha" className="w-full sm:w-auto overflow-visible">
                <Button className="w-full sm:w-auto h-auto py-4 sm:py-5 md:py-6 px-8 sm:px-10 md:px-12 bg-white text-primary hover:bg-gray-50 font-black rounded-2xl md:rounded-3xl text-lg sm:text-xl md:text-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-[1.03] active:scale-[0.97] uppercase tracking-wider group relative overflow-hidden">
                  <span className="relative z-10">Trải nghiệm ngay</span>
                  <ChevronRight className="relative z-10 ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Mockup image / Graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative flex justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-[300px] sm:max-w-[450px] md:max-w-[550px] lg:max-w-full">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-[80px] md:blur-[120px] animate-pulse" />
            {/* Visual element representing a building or property */}
            <div className="relative z-10 aspect-square rounded-[3rem] bg-gradient-to-br from-white/20 to-transparent backdrop-blur-sm border border-white/20 p-8 flex items-center justify-center overflow-hidden shadow-2xl">
               <Building2 className="w-3/4 h-3/4 text-white opacity-20 absolute -bottom-10 -right-10" />
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-transform duration-500">
                    <span className="text-primary text-4xl sm:text-5xl font-black">P</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-widest">PiRoom OS</h3>
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/40" />)}
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modern Wave Divider */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none leading-[0]">
        <svg className="relative block w-full h-[40px] md:h-[80px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.83C51.17,117.06,132.31,114.32,193.45,107.47,219.86,104.53,246.33,100,272.76,95.14,296.88,90.76,321.39,81.1,321.39,56.44Z" fill="#F0FDFA"></path>
        </svg>
      </div>
    </section>
  );
}
