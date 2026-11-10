import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Ensures the admin login from ADMIN_EMAIL / ADMIN_PASSWORD has role "admin" in MongoDB.
export async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Admin").trim();

  if (!email) {
    if ((await User.countDocuments()) === 0) {
      console.warn("\n!! No login exists yet. Add ADMIN_EMAIL and ADMIN_PASSWORD to your .env file and restart.\n");
    }
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
    }
    return;
  }

  if (!password || password.length < 8) {
    console.warn("\n!! ADMIN_PASSWORD must be at least 8 characters. No login was created.\n");
    return;
  }

  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
  });
  console.log(`Admin login created for ${email}.`);
}
