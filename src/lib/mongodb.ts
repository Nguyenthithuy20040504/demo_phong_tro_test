import mongoose from 'mongoose';
import dns from 'node:dns/promises';

// Fix for "querySrv ECONNREFUSED" caused by blocked DNS on local networks
dns.setServers(['1.1.1.1']);

declare global {
  var mongoose: {
    conn: any;
    promise: Promise<any> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Connection pool optimization for Vercel Serverless
      maxPoolSize: 10,          // Tối đa 10 connections cùng lúc
      minPoolSize: 2,           // Giữ tối thiểu 2 connections sẵn
      socketTimeoutMS: 30000,   // Timeout socket 30s
      serverSelectionTimeoutMS: 10000, // Chọn server tối đa 10s
      heartbeatFrequencyMS: 10000,     // Check connection health mỗi 10s
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
