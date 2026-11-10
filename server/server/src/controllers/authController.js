import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../middleware/auth.js";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);
const RESEND_SECONDS = 60;

const NEON_AUTH_BASE = (process.env.NEON_AUTH_BASE_URL || "").trim().replace(/\/+$/, "");
if (!NEON_AUTH_BASE) {
  console.warn("[WARN] NEON_AUTH_BASE_URL not set — Neon Auth features will be disabled.");
}

const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:5173").trim().replace(/\/+$/, "");

const clean = (body = {}) => ({
  name: String(body.name ?? "").trim(),
  email: String(body.email ?? "").trim().toLowerCase(),
  password: String(body.password ?? ""),
  currentPassword: String(body.currentPassword ?? ""),
  newPassword: String(body.newPassword ?? ""),
  code: String(body.code ?? "").replace(/\D/g, ""),
  token: String(body.token ?? "").trim(),
});

// Helper: Call Neon Auth API
async function callNeonAuth(endpoint, body = {}, headers = {}) {
  if (!NEON_AUTH_BASE) return { ok: false, status: 503, data: { message: "Neon Auth is not configured on the server." } };
  try {
    const res = await fetch(`${NEON_AUTH_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": CLIENT_ORIGIN,
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[Neon Auth] ${endpoint} failed (${res.status}):`, data?.message || data);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn(`[Neon Auth] ${endpoint} request failed:`, err.message);
    return { ok: false, status: 502, data: { message: err.message } };
  }
}

// POST /api/auth/register  { name, email, password }
export async function register(req, res) {
  const { name, email, password } = clean(req.body);
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
  if (!NEON_AUTH_BASE) {
    return res.status(503).json({ message: "NEON_AUTH_BASE_URL is not configured on the server." });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: "An account with this email already exists." });

  // Sign up via Neon Auth (Neon automatically sends verification OTP email)
  const neon = await callNeonAuth("sign-up/email", {
    email,
    password,
    name: name || email.split("@")[0],
  });

  if (!neon.ok) {
    const status = neon.status >= 400 && neon.status < 500 ? neon.status : 502;
    return res.status(status).json({
      message: neon.data?.message || "Could not create account in Neon Auth.",
    });
  }

  // Create local user in MongoDB linked by email
  const user = await User.create({
    name: name || neon.data?.user?.name || email.split("@")[0],
    email,
    passwordHash: await bcrypt.hash(password, 12),
    emailVerified: Boolean(neon.data?.user?.emailVerified),
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
      neonSynced: true,
    },
    message: "Account created successfully! Check your email for the verification code.",
  });
}

// POST /api/auth/login  { email, password }
export async function login(req, res) {
  const { email, password } = clean(req.body);
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  // 1. Try Neon Auth
  let neonUser = null;
  const neon = await callNeonAuth("sign-in/email", { email, password });
  if (neon.ok && neon.data?.user) {
    neonUser = neon.data.user;
  }

  // 2. Check Local MongoDB user
  let user = await User.findOne({ email });

  if (neonUser) {
    if (!user) {
      user = await User.create({
        name: neonUser.name || email.split("@")[0],
        email,
        passwordHash: await bcrypt.hash(password, 12),
        emailVerified: Boolean(neonUser.emailVerified),
      });
    } else if (Boolean(neonUser.emailVerified) && !user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    return res.json({
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(neonUser.emailVerified || user.emailVerified),
        neonUser: true,
      },
    });
  }

  // Fallback to local DB check for legacy users, then sync to Neon Auth
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const sync = await callNeonAuth("sign-up/email", { email, password, name: user.name });
  if (sync.ok && sync.data?.user?.emailVerified && !user.emailVerified) {
    user.emailVerified = true;
    await user.save();
  }

  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
    },
  });
}

// GET /api/auth/me  (needs a token)
export function me(req, res) {
  res.json({ user: req.user });
}

// POST /api/auth/forgot  { email }
export async function forgotPassword(req, res) {
  const { email } = clean(req.body);
  if (!email) return res.status(400).json({ message: "Please provide your email address." });
  if (!NEON_AUTH_BASE) {
    return res.status(503).json({ message: "NEON_AUTH_BASE_URL is not configured on the server." });
  }

  const user = await User.findOne({
    $or: [
      { email },
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
    ],
  });

  if (user) {
    const waited = user.resetSentAt ? (Date.now() - user.resetSentAt.getTime()) / 1000 : Infinity;
    if (waited < RESEND_SECONDS) {
      const left = Math.ceil(RESEND_SECONDS - waited);
      return res.status(429).json({ message: `Please wait ${left}s before requesting a new code.` });
    }
    user.resetSentAt = new Date();
    await user.save();
  }

  // Send 6-digit password reset OTP via Neon Auth only
  const neonOtp = await callNeonAuth("email-otp/send-verification-otp", {
    email,
    type: "forget-password",
  });

  if (!neonOtp.ok) {
    console.error("[Forgot Password] Neon Auth OTP delivery failed:", neonOtp);
    const status = neonOtp.status >= 400 && neonOtp.status < 500 ? neonOtp.status : 502;
    return res.status(status).json({
      message: neonOtp.data?.message || "Could not send reset email via Neon Auth.",
    });
  }

  res.json({
    message: `A 6-digit verification code has been sent to ${email} via Neon Auth. Check your email inbox (and Spam folder).`,
    email,
  });
}

// POST /api/auth/reset  { email, code, password }
export async function resetPassword(req, res) {
  const { email, code, password } = clean(req.body);
  const newPass = password || clean(req.body).newPassword;
  if (!email) return res.status(400).json({ message: "Email is required." });
  if (!code || code.length !== 6) {
    return res.status(400).json({ message: "Enter the 6-digit verification code." });
  }
  if (newPass.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }
  if (!NEON_AUTH_BASE) {
    return res.status(503).json({ message: "NEON_AUTH_BASE_URL is not configured on the server." });
  }

  const neon = await callNeonAuth("email-otp/reset-password", {
    email,
    otp: code,
    password: newPass,
  });

  if (!neon.ok) {
    return res.status(400).json({
      message:
        neon.data?.message ||
        "That 6-digit code is incorrect or has expired. Please check your email or request a new code.",
    });
  }

  // Keep MongoDB user password hash in sync
  let user = await User.findOne({
    $or: [
      { email },
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
    ],
  });

  const passwordHash = await bcrypt.hash(newPass, 12);
  if (user) {
    user.passwordHash = passwordHash;
    user.resetCodeHash = "";
    user.resetCodeExpires = null;
    user.resetAttempts = 0;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  } else {
    await User.create({
      name: email.split("@")[0],
      email,
      passwordHash,
    });
  }

  res.json({ message: "Password updated successfully! You can now log in." });
}

// POST /api/auth/update-password  { currentPassword, newPassword }  (needs requireAuth)
export async function updatePassword(req, res) {
  const { currentPassword, newPassword } = clean(req.body);
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ message: "Current password is incorrect." });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  // Sync with Neon Auth
  callNeonAuth("sign-in/email", { email: user.email, password: currentPassword })
    .then(async (r) => {
      if (r.ok && r.data?.token) {
        await callNeonAuth(
          "change-password",
          { currentPassword, newPassword, revokeOtherSessions: true },
          { Authorization: `Bearer ${r.data.token}` }
        );
      }
    })
    .catch(() => {});

  res.json({ message: "Password updated successfully." });
}

// POST /api/auth/send-verification  (needs requireAuth) - Sends verification OTP via Neon Auth only
export async function sendVerification(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  if (user.emailVerified) {
    return res.json({ message: "Your email is already verified!" });
  }
  if (!NEON_AUTH_BASE) {
    return res.status(503).json({ message: "NEON_AUTH_BASE_URL is not configured on the server." });
  }

  const neonOtp = await callNeonAuth("email-otp/send-verification-otp", {
    email: user.email,
    type: "email-verification",
  });

  if (!neonOtp.ok) {
    console.error("[Send Verification] Neon Auth OTP delivery failed:", neonOtp);
    const status = neonOtp.status >= 400 && neonOtp.status < 500 ? neonOtp.status : 502;
    return res.status(status).json({
      message: neonOtp.data?.message || "Could not send verification email via Neon Auth.",
    });
  }

  res.json({
    message: `Verification code sent to ${user.email} via Neon Auth! Please check your email inbox (and Spam folder).`,
  });
}

// POST /api/auth/verify-email-otp  { code } (needs requireAuth) - Verifies 6-digit OTP via Neon Auth
export async function verifyEmailOtp(req, res) {
  const { code } = clean(req.body);
  if (!code || code.length !== 6) {
    return res.status(400).json({ message: "Please enter the 6-digit verification code." });
  }
  if (!NEON_AUTH_BASE) {
    return res.status(503).json({ message: "NEON_AUTH_BASE_URL is not configured on the server." });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  const neon = await callNeonAuth("email-otp/verify-email", {
    email: user.email,
    otp: code,
  });

  if (!neon.ok) {
    return res.status(400).json({
      message: neon.data?.message || "Invalid or expired verification code.",
    });
  }

  user.emailVerified = true;
  user.verificationTokenHash = "";
  user.verificationTokenExpires = null;
  await user.save();

  res.json({
    message: "Email verified successfully! Your account is now fully verified.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
    },
  });
}

// GET /api/auth/verify-email?token=...  (Legacy link endpoint)
export async function verifyEmail(req, res) {
  const token = String(req.query.token || "").trim();
  if (!token) {
    return res.status(400).json({ message: "Verification link is missing or invalid." });
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    verificationTokenHash: hash,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      message: "This verification link has expired or has already been used. Please request a new 6-digit code in Settings.",
    });
  }

  user.emailVerified = true;
  user.verificationTokenHash = "";
  user.verificationTokenExpires = null;
  await user.save();

  res.json({
    message: "Email verified successfully! Your account is now fully verified.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
    },
  });
}
