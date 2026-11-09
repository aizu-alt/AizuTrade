import jwt from "jsonwebtoken";
import User from "../models/User.js";

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
  jwt.sign({ sub: user.id, tv: user.tokenVersion ?? 0 }, SECRET, { expiresIn: "7d" });

// blocks every request that does not carry a valid login token
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

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}