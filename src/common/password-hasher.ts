// src/common/password-hasher.ts
import bcryptjs from "bcryptjs";

let nativeBcrypt: typeof import("bcrypt") | undefined;
try {
  // Only available when native bindings can load (not in pkg runtime).
  nativeBcrypt = require("bcrypt");
} catch (error) {
  nativeBcrypt = undefined;
}

const hasNative = Boolean(nativeBcrypt) && !((process as any).pkg);

export async function hashPassword(password: string, saltRounds = 10): Promise<string> {
  if (hasNative && nativeBcrypt) {
    return nativeBcrypt.hash(password, saltRounds);
  }
  return bcryptjs.hash(password, saltRounds);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  if (hasNative && nativeBcrypt) {
    return nativeBcrypt.compare(plain, hashed);
  }
  return bcryptjs.compare(plain, hashed);
}
