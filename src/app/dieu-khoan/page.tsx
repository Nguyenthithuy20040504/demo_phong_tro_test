'use client';

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ShieldCheck, HelpCircle } from "lucide-react";

export default function DieuKhoanPage() {
  return (
    <main className="min-h-screen bg-[#F0FDFA] relative flex flex-col">
      <Navbar />
      
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #14B8A6 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="container mx-auto px-6 py-32 relative z-10 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-black font-cinzel text-[#134E4A] mb-4 uppercase tracking-tight">
              Điều khoản <span className="text-[#14B8A6]">dịch vụ</span>
            </h1>
            <p className="text-lg font-josefin text-gray-500">Cập nhật lần cuối: 12 tháng 04, 2026</p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden border-t-8 border-[#14B8A6]">
            <CardContent className="p-8 md:p-12">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-10 text-[#134E4A]/80 font-josefin leading-relaxed">
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#14B8A6]">
                        <FileText size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">1. Chấp thuận điều khoản</h2>
                    </div>
                    <p className="mb-4">
                      Bằng việc truy cập và sử dụng nền tảng PiRoom, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu tại đây. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, bạn vui lòng không sử dụng dịch vụ của chúng tôi.
                    </p>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#14B8A6]">
                        <ShieldCheck size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">2. Quyền và Trách nhiệm của Người dùng</h2>
                    </div>
                    <div className="space-y-4">
                      <p>Người dùng (Chủ nhà/Khách thuê) cam kết cung cấp thông tin chính xác, trung thực khi đăng ký tài khoản trên hệ thống.</p>
                      <p>Bạn hoàn toàn chịu trách nhiệm về việc bảo mật thông tin tài khoản và mật khẩu của mình.</p>
                      <p>Không sử dụng dịch vụ cho bất kỳ mục đích bất hợp pháp hoặc gian lận nào.</p>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#14B8A6]">
                        <FileText size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">3. Dịch vụ và Thanh toán</h2>
                    </div>
                    <p className="mb-4">
                      PiRoom cung cấp các gói dịch vụ quản lý với các tính năng và mức giá khác nhau. Các giao dịch thanh toán gói SaaS sẽ được xử lý qua các cổng thanh toán tích hợp (như PayOS).
                    </p>
                    <p>
                      Các khoản phí dịch vụ đã thanh toán sẽ không được hoàn trả trừ trường hợp có lỗi kỹ thuật nghiêm trọng từ phía hệ thống mà chúng tôi không thể khắc phục.
                    </p>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#14B8A6]">
                        <ShieldCheck size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">4. Giới hạn trách nhiệm</h2>
                    </div>
                    <p>
                      Chúng tôi nỗ lực để đảm bảo hệ thống hoạt động ổn định nhưng không đảm bảo rằng dịch vụ sẽ không bị gián đoạn hoặc không có lỗi. PiRoom không chịu trách nhiệm cho bất kỳ thiệt hại trực tiếp hoặc gián tiếp nào phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ.
                    </p>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#F0FDFA] rounded-xl text-[#14B8A6]">
                        <HelpCircle size={24} />
                      </div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide">5. Thay đổi điều khoản</h2>
                    </div>
                    <p>
                      Chúng tôi có quyền sửa đổi hoặc thay thế các điều khoản này bất cứ lúc nào. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên website.
                    </p>
                  </section>

                  <div className="pt-10 border-t border-gray-100 italic text-center">
                    Cảm ơn bạn đã tin tưởng và sử dụng PiRoom!
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
