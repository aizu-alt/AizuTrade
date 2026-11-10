import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isNeonAdmin } from "../config/neon.js";

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) {
  throw new Error(
    'JWT_SECRET is missing (or too short) in your server .env file. Add a line like JWT_SECRET=<64 random characters>. ' +
      'Create one with:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

export const authSecret = SECRET;

// the token remembers the user and their tokenVersion
export const signToken = (user) =>
  jwt.sign({ sub: user.id, tv: user.tokenVersion ?? 0, role: user.role || "user" }, SECRET, { expiresIn: "7d" });

// blocks every request that does not carry a valid admin login token
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Please log in." });

    let payload;
    try {
      payload = jwt.verify(token, SECRET);
    } catch {
      return res.status(401).json({ message: "Your session has expired. Please log in again." });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Account not found. Please log in again." });
    // password was reset after this token was issued
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ message: "Your password was changed. Please log in again." });
    }

    // Verify user is still an admin in Neon Auth
    const neonIsAdmin = await isNeonAdmin(user.email);
    if (!neonIsAdmin) {
      if (user.role !== "user") {
        user.role = "user";
        await user.save();
      }
      return res.status(403).json({ message: "Access denied. Only the admin user can access this app." });
    }

    if (user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Explicitly ensures only the admin user can create, edit, or delete data
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required. Only the admin can edit or delete data." });
  }
  next();
}
