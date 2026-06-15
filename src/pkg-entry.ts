// src/pkg-entry.ts
import path from "path";
import fs from "fs";

if (!(global as any).crypto) {
  (global as any).crypto = require("crypto");
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const defaultDatabasePath = path.resolve(process.cwd(), "database.sqlite");
if (!process.env.DATABASE_PATH) {
  process.env.DATABASE_PATH = defaultDatabasePath;
}

if (!fs.existsSync(process.env.DATABASE_PATH)) {
  try {
    fs.writeFileSync(process.env.DATABASE_PATH, "");
  } catch (error) {
    console.error(`Failed to initialize database at ${process.env.DATABASE_PATH}:`, error);
  }
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "your-secret-key-here";
}

if (!process.env.PORT) {
  process.env.PORT = process.env.BACKEND_PORT || "8999";
}

// Defer to the compiled Nest entrypoint.
require("./main.js");
