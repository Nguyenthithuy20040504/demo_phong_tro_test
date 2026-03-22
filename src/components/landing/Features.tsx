"use client";

import { motion } from "framer-motion";
import { Building2, FileText, Settings, Users, ShieldCheck, Zap } from "lucide-react";

const features = [
  {
    icon: <Building2 className="h-10 w-10 text-[#0F766E]" />,
    title: "Quản Lý Tòa Nhà",
    description: "Quản lý tập trung nhiều tòa nhà, dãy phòng trọ chỉ trên một màn hình duy nhất."
  },
  {
    icon: <Users className="h-10 w-10 text-[#0F766E]" />,
    title: "Quản Lý Người Thuê",
    description: "Lưu trữ hồ sơ cư dân, hợp đồng thuê và các thông tin cá nhân bảo mật và an toàn."
  },
  {
    icon: <FileText className="h-10 w-10 text-[#0F766E]" />,
    title: "Tự Động Xuất Hóa Đơn",
    description: "Tính toán tiền điện, nước, dịch vụ và xuất file PDF hóa đơn chuyên nghiệp mỗi tháng."
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-[#0F766E]" />,
    title: "Bảo Mật Hàng Đầu",
    description: "Hệ thống bảo mật dữ liệu cấp cao, đảm bảo thông tin của bạn luôn ở trong tay bạn."
  },
  {
    icon: <Zap className="h-10 w-10 text-[#0F766E]" />,
    title: "Gia Hạn Dễ Dàng",
    description: "Theo dõi và gia hạn gói dịch vụ SaaS ngay trên trang quản trị chủ trọ để duy trì vận hành."
  },
  {
    icon: <Settings className="h-10 w-10 text-[#0F766E]" />,
    title: "Cấu Hình Linh Hoạt",
    description: "Tùy chỉnh phí dịch vụ, bảng giá và nội quy phòng trọ linh hoạt theo từng khu vực."
  }
];

export function Features() {
  return (
    <section id="tinh-nang" className="py-32 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#0F766E]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-[#0369A1]/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-24 max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-6 py-2 rounded-full border border-[#0F766E]/20 bg-[#0F766E]/5 text-[#0F766E] font-cinzel font-bold text-sm tracking-widest"
          >
            TÍNH NĂNG NỔI BẬT
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-cinzel font-bold text-[#134E4A] leading-tight"
          >
            Giải Pháp Quản Lý <span className="text-[#14B8A6]">Toàn Diện</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-[#134E4A]/80 font-josefin leading-relaxed"
          >
            Chúng tôi cung cấp mọi công cụ cần thiết để vận hành hệ thống phòng trọ quy mô từ 1 đến hàng nghìn phòng.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-10 bg-white rounded-[2rem] shadow-xl shadow-[#0F766E]/5 hover:shadow-2xl hover:shadow-[#0F766E]/10 border border-[#0F766E]/5 hover:border-[#14B8A6]/20 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
            >
              <div className="mb-8 w-20 h-20 flex items-center justify-center rounded-2xl bg-[#0F766E]/10 group-hover:bg-[#14B8A6] group-hover:text-white group-hover:rotate-6 transition-all duration-500">
                <div className="group-hover:text-white transition-colors duration-500">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-2xl font-cinzel font-bold text-[#134E4A] mb-4 group-hover:text-[#0F766E] transition-colors">
                {feature.title}
              </h3>
              <p className="text-lg text-[#134E4A]/70 font-josefin leading-relaxed group-hover:text-[#134E4A] transition-colors">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
