import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

const cached = ((global as any).mongoose ??= { conn: null, promise: null });

export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");

  cached.promise ??= mongoose.connect(MONGODB_URI, {
    dbName: "devOVerflow",
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Don't cache a failed attempt, so the next request retries.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
};
