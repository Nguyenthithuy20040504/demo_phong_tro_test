import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function BangGiaPage() {
  return (
    <main className="min-h-screen bg-[#F0FDFA]">
      <Navbar />
      <div>
        <Pricing />
      </div>
      <Footer />
    </main>
  );
}
