import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Use global cache to avoid creating multiple connections in dev
let cached: MongooseConnection = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
  // If already connected, return the existing connection
  if (cached.conn) return cached.conn;

  // Fail fast if missing
  if (!MONGODB_URL) {
    throw new Error(
      "❌ Missing MONGODB_URL environment variable. " +
      "Make sure it is set in your Vercel project settings."
    );
  }

  // Log the URL for debugging in development (mask credentials)
  if (process.env.NODE_ENV === "development") {
    const safeUrl = MONGODB_URL.replace(/\/\/.*@/, "//<credentials>@");
    console.log("🔌 Connecting to MongoDB:", safeUrl);
  }

  // Create the connection if not already in progress
  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: "imaginify",
      bufferCommands: false,
    });

  cached.conn = await cached.promise;
  return cached.conn;
};
