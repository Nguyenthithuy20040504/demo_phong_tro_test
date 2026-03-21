import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Cinzel, Josefin_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PiRoom - Hệ thống quản lý phòng trọ",
  description: "Giải pháp số hóa toàn diện giúp chủ trọ tối ưu hóa doanh thu và vận hành tự động.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${cinzel.variable} ${josefin.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}