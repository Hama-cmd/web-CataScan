import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

// On Vercel, the file system is read-only except for /tmp
const isVercel = process.env.VERCEL || process.env.NODE_ENV === "production";
const DB_FILE = isVercel ? "/tmp/sqlite.db" : "sqlite.db";

// If on Vercel and db doesn't exist, we just start fresh
const sqlite = new Database(DB_FILE);
const db = drizzle(sqlite, { schema });

// Automatically create tables for ephemeral Vercel deployment
sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expire INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS screenings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  analysis TEXT NOT NULL,
  created_at INTEGER
);
`);

export { db };

