import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./mongodb";
import NguoiDung from "@/models/NguoiDung";
import KhachThue from "@/models/KhachThue";
import { compare } from "bcryptjs";
import { UserService } from "@/services/user.service";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        matKhau: { label: "Mật khẩu", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.matKhau) return null;

        try {
          await dbConnect();

          const email = credentials.email.toLowerCase();
          const matKhau = credentials.matKhau;

          const user = await NguoiDung.findOne({
            email,
            trangThai: "hoatDong",
          }).select("+matKhau");

          if (user) {
            const ok = await user.comparePassword(matKhau);
            if (!ok) return null;

            // Cập nhật lastLogin qua Service
            await UserService.updateLastLogin(user._id.toString(), user.vaiTro || user.role);

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.ten || user.name,
              role: user.vaiTro || user.role || "admin",
              phone: user.soDienThoai || user.phone,
              avatar: user.anhDaiDien || user.avatar || undefined,
              goiDichVu: user.goiDichVu,
              ngayHetHan: user.ngayHetHan ? user.ngayHetHan.toISOString() : undefined,
            };
          }

          const client = await KhachThue.findOne({
            email,
            //trangThai: "dangThue",
          }).select("+matKhau");

          if (!client) return null;

          const ok =
            typeof (client as any).comparePassword === "function"
              ? await (client as any).comparePassword(matKhau)
              : await compare(matKhau, (client as any).matKhau);

          if (!ok) return null;

          // Cập nhật lastLogin cho khách thuê qua Service
          await UserService.updateLastLogin(client._id.toString(), 'khachThue');

          return {
            id: client._id.toString(),
            email: client.email,
            name: client.hoTen,
            role: "khachThue",
            phone: client.soDienThoai,
            avatar: undefined,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.avatar = (user as any).avatar;
        token.goiDichVu = (user as any).goiDichVu;
        token.ngayHetHan = (user as any).ngayHetHan;
      }
      
      // Handle session update
      if (trigger === "update" && session) {
        token.goiDichVu = (session.user as any).goiDichVu;
        token.ngayHetHan = (session.user as any).ngayHetHan;
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
        session.user.avatar = (token.avatar as string) ?? undefined;
        (session.user as any).goiDichVu = token.goiDichVu as string;
        (session.user as any).ngayHetHan = token.ngayHetHan as string;
        
        if (token.email) session.user.email = token.email;
      }
      return session;
    },
  },

  pages: {
    signIn: "/dang-nhap",
    error: "/dang-nhap",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
