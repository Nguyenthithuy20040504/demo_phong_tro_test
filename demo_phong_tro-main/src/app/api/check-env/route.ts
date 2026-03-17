import { NextResponse } from "next/server";

function mask(uri?: string) {
  if (!uri) return "MISSING";
  // che user/pass trong mongodb uri
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

function getMongoDbName(uri?: string) {
  if (!uri) return "MISSING";
  try {
    // lấy phần sau ".net/" đến trước "?"
    const part = uri.split(".net/")[1] || "";
    return (part.split("?")[0] || "").trim() || "MISSING";
  } catch {
    return "UNKNOWN";
  }
}

export async function GET() {
  const mongoUri = process.env.MONGODB_URI;

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "NOT_VERCEL",
    vercelUrl: process.env.VERCEL_URL || "MISSING",

    nextAuthUrl: process.env.NEXTAUTH_URL || "MISSING",
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,

    hasMongo: !!mongoUri,
    mongoDbName: getMongoDbName(mongoUri),
    mongoUriMasked: mask(mongoUri),

    cloudName: process.env.NEXT_PUBLIC_CLOUD_NAME || "MISSING",
    uploadPreset: process.env.NEXT_PUBLIC_UPLOAD_PRESET || "MISSING",
  });
}
