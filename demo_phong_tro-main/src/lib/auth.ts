import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./mongodb";
import NguoiDung from "@/models/NguoiDung";
import KhachThue from "@/models/KhachThue";
import { compare } from "bcryptjs";

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

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.ten,
              role: "admin",
              phone: user.soDienThoai,
              avatar: user.anhDaiDien ?? null,
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

          return {
            id: client._id.toString(),
            email: client.email,
            name: client.hoTen,
            role: "khachThue",
            phone: client.soDienThoai,
            avatar: null,
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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.avatar = (user as any).avatar;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      session.user.phone = token.phone as string;
      session.user.avatar = (token.avatar as string) ?? undefined;
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
