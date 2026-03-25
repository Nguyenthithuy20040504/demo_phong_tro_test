import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "./mongodb";
import NguoiDung from "@/models/NguoiDung";
import KhachThue from "@/models/KhachThue";
import { compare } from "bcryptjs";
import { UserService } from "@/services/user.service";
import crypto from "crypto";

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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          console.log("Google sign-in attempt for:", user.email);
          await dbConnect();
          const existingUser = await NguoiDung.findOne({ email: user.email });

          if (!existingUser) {
            console.log("Creating new Google user:", user.email);
            // Tự động tạo tài khoản Chủ nhà nếu chưa tồn tại
            const randomPassword = crypto.randomBytes(16).toString("hex");
            const newUser = new NguoiDung({
              ten: user.name || "User",
              name: user.name || "User",
              email: user.email,
              matKhau: randomPassword,
              password: randomPassword,
              vaiTro: "chuNha",
              role: "chuNha",
              anhDaiDien: user.image,
              avatar: user.image,
              trangThai: "hoatDong",
              isActive: true,
            });
            await newUser.save();
            console.log("New Google user created successfully");
          } else {
            console.log("Existing user found for Google sign-in:", user.email);
            // Nếu đã có tài khoản, cập nhật ảnh đại diện nếu chưa có
            if (!existingUser.anhDaiDien || !existingUser.avatar) {
              existingUser.anhDaiDien = user.image;
              existingUser.avatar = user.image;
              await existingUser.save();
            }
          }
          return true;
        } catch (error: any) {
          console.error("Error during Google sign in:", error);
          // Return false to stop the flow and show the error on login page
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Mặc định gán id từ object user (Credentials hoặc OAuth sub)
        token.id = user.id;

        // Nếu đăng nhập qua OAuth (Google), fetch thông tin đầy đủ từ DB
        if (!(user as any).role) {
          await dbConnect();
          const dbUser = await NguoiDung.findOne({ email: user.email });
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.vaiTro || dbUser.role || "chuNha";
            token.phone = dbUser.soDienThoai || dbUser.phone;
            token.avatar = dbUser.anhDaiDien || dbUser.avatar;
            token.goiDichVu = dbUser.goiDichVu;
            token.ngayHetHan = dbUser.ngayHetHan ? dbUser.ngayHetHan.toISOString() : undefined;
            
            // Cập nhật thời điểm đăng nhập cuối cùng
            try {
              const userRole = dbUser.vaiTro || dbUser.role || "chuNha";
              await UserService.updateLastLogin(dbUser._id.toString(), userRole);
            } catch (e) {
              console.error("Error updating last login for OAuth user:", e);
            }
          }
        } else {
          // Trường hợp Credentials đã có sẵn các field này
          token.id = (user as any).id || (user as any)._id?.toString();
          token.role = (user as any).role;
          token.phone = (user as any).phone;
          token.avatar = (user as any).avatar;
          token.goiDichVu = (user as any).goiDichVu;
          token.ngayHetHan = (user as any).ngayHetHan;
        }
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
        session.user.id = (token.id as string) || token.sub!;
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
