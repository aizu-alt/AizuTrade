import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Creates the login from ADMIN_EMAIL / ADMIN_PASSWORD (in .env) the first time the server starts.
// An account that already exists is never changed here (use "Forgot password" to change it).
export async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Admin").trim();

  if (!email || !password) {
    if ((await User.countDocuments()) === 0) {
      console.warn("\n!! No login exists yet. Add ADMIN_EMAIL and ADMIN_PASSWORD to your .env file and restart.\n");
    }
    return;
  }
  if (password.length < 8) {
    console.warn("\n!! ADMIN_PASSWORD must be at least 8 characters. No login was created.\n");
    return;
  }
  if (await User.findOne({ email })) return;

  await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  console.log(`Login created for ${email}. You can now remove ADMIN_PASSWORD from .env.`);
}