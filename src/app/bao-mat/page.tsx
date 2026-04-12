'use client';

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, Fingerprint, Lock, Eye } from "lucide-react";

export default function BaoMatPage() {
  return (
    <main className="min-h-screen bg-[#F0FDFA] relative flex flex-col">
      <Navbar />
      
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #0D9488 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="container mx-auto px-6 py-32 relative z-10 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-black font-cinzel text-[#134E4A] mb-4 uppercase tracking-tight">
              Chính sách <span className="text-[#14B8A6]">bảo mật</span>
            </h1>
            <p className="text-lg font-josefin text-gray-500">Cập nhật lần cuối: 12 tháng 04, 2026</p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden border-t-8 border-[#0D9488]">
            <CardContent className="p-8 md:p-12">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-10 text-[#134E4A]/80 font-josefin leading-relaxed">
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#0D9488]">
                        <Fingerprint size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">1. Thu thập thông tin</h2>
                    </div>
                    <p className="mb-4">
                      Chúng tôi thu thập thông tin cần thiết để cung cấp dịch vụ quản lý phòng trọ hiệu quả, bao gồm:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Thông tin cá nhân: Họ tên, số điện thoại, email, địa chỉ.</li>
                      <li>Thông tin tài sản: Địa chỉ tòa nhà, thông tin phòng.</li>
                      <li>Thông tin thanh toán: Lịch sử tiền thuê, trạng thái hóa đơn.</li>
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#0D9488]">
                        <Eye size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">2. Sử dụng thông tin</h2>
                    </div>
                    <p className="mb-4">
                      Thông tin của bạn được sử dụng cho các mục đích:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Quản lý hợp đồng và tính toán hóa đơn tự động.</li>
                      <li>Gửi thông báo nhắc nợ, thông báo từ chủ nhà/hệ thống.</li>
                      <li>Cải thiện trải nghiệm người dùng và phát triển tính năng mới.</li>
                      <li>Hỗ trợ kỹ thuật và giải quyết các vấn đề phát sinh.</li>
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#0D9488]">
                        <Lock size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">3. Bảo mật dữ liệu</h2>
                    </div>
                    <p className="mb-4">
                      Dữ liệu của bạn được mã hóa và lưu trữ an toàn trên các máy chủ đám mây tiêu chuẩn. Chúng tôi áp dụng các biện pháp bảo mật nghiêm ngặt để ngăn chặn truy cập trái phép, tiết lộ hoặc phá hủy thông tin cá nhân.
                    </p>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#0D9488]">
                        <ShieldAlert size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">4. Chia sẻ với bên thứ ba</h2>
                    </div>
                    <p>
                      Chúng tôi cam kết không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Chúng tôi chỉ chia sẻ thông tin trong trường hợp pháp luật yêu cầu hoặc khi cần thiết để thực hiện các dịch vụ thanh toán mà bạn yêu cầu.
                    </p>
                  </section>

                  <div className="pt-10 border-t border-gray-100 italic text-center">
                    Bảo mật của bạn là ưu tiên hàng đầu của chúng tôi.
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  );
}
