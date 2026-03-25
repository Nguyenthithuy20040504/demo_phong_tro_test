"use client";

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    id: "mienPhi",
    name: "Gói Miễn Phí",
    price: "0",
    period: "Tháng đầu",
    description: "Miễn phí 1 tháng đầu tiên cho mọi khách hàng mới.",
    features: [
      "Quản lý tối đa 10 phòng",
      "Đầy đủ tính năng cơ bản",
      "Hỗ trợ qua Zalo/Email",
      "Không cần thẻ tín dụng",
      "Dễ dàng nâng cấp"
    ],
    cta: "Thử ngay",
    popular: false
  },
  {
    id: "basic",
    name: "Gói Cơ Bản",
    price: "1.000.000",
    period: "tháng",
    description: "Giải pháp tối ưu cho chủ trọ mới bắt đầu.",
    features: [
      "Quản lý tối đa 20 phòng",
      "Tự động xuất hóa đơn PDF",
      "Quản lý dịch vụ điện/nước",
      "Hỗ trợ qua Zalo/Email",
      "Báo cáo cơ bản"
    ],
    cta: "Bắt đầu ngay",
    popular: false
  },
  {
    id: "professional",
    name: "Gói Chuyên Nghiệp",
    price: "5.000.000",
    period: "6 tháng",
    description: "Lựa chọn phổ biến nhất cho dãy trọ vừa.",
    features: [
      "Quản lý không giới hạn phòng",
      "Hệ thống báo cáo chuyên sâu",
      "Nhắc nợ tự động qua Zalo",
      "Tính năng gia hạn tự động",
      "Hỗ trợ ưu tiên 24/7",
      "Tích hợp QR thanh toán"
    ],
    cta: "Khuyên dùng",
    popular: true
  }
];

export function Pricing() {
  return (
    <section id="bang-gia" className="pt-12 pb-24 bg-[#F0FDFA] relative overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-6 py-2 rounded-full border border-[#0F766E]/20 bg-[#0F766E]/5 text-[#0F766E] font-cinzel font-bold text-sm tracking-widest"
          >
            BẢNG GIÁ DỊCH VỤ
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-cinzel font-bold text-[#134E4A] leading-tight"
          >
            Đầu Tư Cho Sự <span className="text-[#14B8A6]">Bền Vững</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-[#134E4A]/70 font-josefin"
          >
            Chọn gói dịch vụ phù hợp để bắt đầu hành trình số hóa quản lý phòng trọ chuyên nghiệp.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-[2rem] flex flex-col transition-all duration-500 hover:-translate-y-2 group cursor-pointer ${
                plan.popular 
                ? "bg-[#134E4A] text-white shadow-2xl shadow-[#134E4A]/30" 
                : "bg-white text-[#134E4A] border border-[#0F766E]/5 shadow-xl shadow-[#0F766E]/5 hover:shadow-2xl hover:shadow-[#0F766E]/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-[#14B8A6] text-white px-6 py-2 rounded-full text-sm font-bold font-cinzel tracking-widest shadow-lg">
                  PHỔ BIẾN NHẤT
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-cinzel font-bold mb-2 uppercase tracking-wide">
                  {plan.name}
                </h3>
                <p className={`text-sm font-josefin ${plan.popular ? "text-white/70" : "text-[#134E4A]/70"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-4xl font-cinzel font-black tracking-tighter">
                  {plan.price}
                </span>
                <span className="text-lg font-josefin font-medium uppercase opacity-60">
                  đ / {plan.period}
                </span>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-base font-josefin font-light">
                    <div className={`p-1 rounded-full ${plan.popular ? "bg-[#14B8A6]/20" : "bg-[#0F766E]/10"}`}>
                      <Check className={`h-3.5 w-3.5 ${plan.popular ? "text-[#14B8A6]" : "text-[#0F766E]"}`} />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/dang-ky?vaiTro=chuNha&plan=${plan.id}`}>
                <Button 
                  className={`w-full py-5 rounded-xl font-josefin font-bold text-base transition-all shadow-lg ${
                    plan.popular
                    ? "bg-[#14B8A6] hover:bg-white hover:text-[#134E4A] text-white shadow-[#14B8A6]/30"
                    : "bg-[#0369A1] hover:bg-[#134E4A] text-white shadow-[#0369A1]/20"
                  }`}
                >
                  <Zap className="mr-2 h-5 w-5 fill-current" />
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="font-josefin text-[#134E4A]/60 italic">
            * Liên hệ trực tiếp với chúng tôi nếu bạn có hệ thống trên 500 phòng để nhận báo giá Custom.
          </p>
        </div>
      </div>
    </section>
  );
}
