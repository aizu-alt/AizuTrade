import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken, authSecret } from "../middleware/auth.js";
import { sendResetCode, sendVerificationLink } from "../utils/mailer.js";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const SAME_ANSWER = { message: "If that email has an account, instructions have been sent to it." };

const NEON_AUTH_BASE = process.env.NEON_AUTH_BASE_URL;
if (!NEON_AUTH_BASE) {
  console.warn("[WARN] NEON_AUTH_BASE_URL not set — Neon Auth features will be disabled.");
}

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const clean = (body = {}) => ({
  name: String(body.name ?? "").trim(),
  email: String(body.email ?? "").trim().toLowerCase(),
  password: String(body.password ?? ""),
  currentPassword: String(body.currentPassword ?? ""),
  newPassword: String(body.newPassword ?? ""),
  code: String(body.code ?? "").replace(/\D/g, ""),
  token: String(body.token ?? "").trim(),
});

const hashCode = (userId, code) =>
  crypto.createHmac("sha256", authSecret).update(`${userId}:${code}`).digest("hex");

// Helper: Call Neon Auth API
async function callNeonAuth(endpoint, body = {}, headers = {}) {
  if (!NEON_AUTH_BASE) return { ok: false, status: 503, error: "Neon Auth not configured" };
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
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn(`[Neon Auth] ${endpoint} request failed:`, err.message);
    return { ok: false, status: 500, error: err.message };
  }
}

// POST /api/auth/register  { name, email, password }
export async function register(req, res) {
  const { name, email, password } = clean(req.body);
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

  // Check if exists locally
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: "An account with this email already exists." });

  // Call Neon Auth sign up
  const neon = await callNeonAuth("sign-up/email", {
    email,
    password,
    name: name || email.split("@")[0],
  });

  // Create local user in MongoDB
  const user = await User.create({
    name: name || (neon.ok && neon.data.user?.name) || email.split("@")[0],
    email,
    passwordHash: await bcrypt.hash(password, 12),
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(neon.data?.user?.emailVerified),
      neonSynced: neon.ok,
    },
    message: "Account created successfully! Check your email for verification.",
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
    // If authenticated via Neon but not in local DB, create local record
    if (!user) {
      user = await User.create({
        name: neonUser.name || email.split("@")[0],
        email,
        passwordHash: await bcrypt.hash(password, 12),
      });
    }
    return res.json({
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(neonUser.emailVerified),
        neonUser: true,
      },
    });
  }

  // Fallback to local DB check
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  // If local user authenticated, try to sync to Neon Auth in background
  callNeonAuth("sign-up/email", { email, password, name: user.name }).catch(() => {});

  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: false,
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
  if (!email) return res.json({ message: "Please provide your email address." });

  let user = await User.findOne({
    $or: [
      { email },
      { email: email.toLowerCase() },
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }
    ]
  });

  if (!user) {
    // If not found in MongoDB, auto-create the user record so they can reset their password
    user = await User.create({
      name: email.split("@")[0],
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12),
    });
  }

  const waited = user.resetSentAt ? (Date.now() - user.resetSentAt.getTime()) / 1000 : Infinity;
  if (waited < RESEND_SECONDS) {
    const left = Math.ceil(RESEND_SECONDS - waited);
    return res.status(429).json({ message: `Please wait ${left}s before requesting a new code.` });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  user.resetCodeHash = hashCode(user.id, code);
  user.resetCodeExpires = new Date(Date.now() + CODE_MINUTES * 60 * 1000);
  user.resetAttempts = 0;
  user.resetSentAt = new Date();
  await user.save();

  console.log(`\n======================================================`);
  console.log(`🔐 [AIZU TRADE] FORGOT PASSWORD 6-DIGIT CODE: ${code}`);
  console.log(`📧 For account: ${user.email} (expires in 10 minutes)`);
  console.log(`======================================================\n`);

  // 1. Send 6-digit OTP code to real email inbox via Neon Auth
  callNeonAuth("email-otp/send-verification-otp", {
    email: user.email,
    type: "forget-password",
  }).catch((err) => console.warn("Neon OTP send warning:", err.message));

  // 2. Also send reset link via Neon Auth SendGrid
  callNeonAuth("request-password-reset", {
    email: user.email,
    redirectTo: `${CLIENT_ORIGIN}/forgot-password`,
  }).catch(() => {});

  // 3. Local nodemailer if configured
  sendResetCode(user.email, user.name, code).catch((err) =>
    console.error("Could not send reset email:", err.message)
  );

  res.json({
    message: `A 6-digit verification code has been sent to ${user.email}. Check your email inbox.`,
    email: user.email,
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

  // 1. Try Neon Auth OTP reset
  let neonSuccess = false;
  const neon = await callNeonAuth("email-otp/reset-password", {
    email,
    otp: code,
    password: newPass,
  });
  if (neon.ok) {
    neonSuccess = true;
  }

  // 2. Check local code fallback
  const user = await User.findOne({
    $or: [
      { email },
      { email: email.toLowerCase() },
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
    ],
  });

  let localSuccess = false;
  if (user && user.resetCodeHash && user.resetCodeExpires && user.resetCodeExpires.getTime() >= Date.now()) {
    if (user.resetAttempts < MAX_ATTEMPTS) {
      const given = Buffer.from(hashCode(user.id, code));
      const real = Buffer.from(user.resetCodeHash);
      if (given.length === real.length && crypto.timingSafeEqual(given, real)) {
        localSuccess = true;
      } else {
        user.resetAttempts += 1;
        await user.save();
      }
    }
  }

  if (!neonSuccess && !localSuccess) {
    return res.status(400).json({
      message: "That 6-digit code is incorrect or has expired. Please check your email or request a new code.",
    });
  }

  if (user) {
    user.passwordHash = await bcrypt.hash(newPass, 12);
    user.resetCodeHash = "";
    user.resetCodeExpires = null;
    user.resetAttempts = 0;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  }

  // Sync password change to Neon Auth
  callNeonAuth("sign-in/email", { email, password: newPass }).catch(() => {});

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

  // Try to sync with Neon Auth
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

// POST /api/auth/send-verification  (needs requireAuth) - Sends real verification email via Neon Auth + Link
export async function sendVerification(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  if (user.emailVerified) {
    return res.json({ message: "Your email is already verified!" });
  }

  // 1. Send OTP code via Neon Auth directly to user's real email inbox
  callNeonAuth("email-otp/send-verification-otp", {
    email: user.email,
    type: "email-verification",
  }).catch((err) => console.warn("Neon OTP send-verification failed:", err.message));

  // 2. Also send verification email via Neon Auth
  callNeonAuth("send-verification-email", { email: user.email }).catch(() => {});

  // 3. Generate verification link
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.verificationTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  const link = `${CLIENT_ORIGIN}/verify-email?token=${rawToken}`;

  console.log(`\n======================================================`);
  console.log(`🔗 [AIZU TRADE] EMAIL VERIFICATION LINK:`);
  console.log(`👉 ${link}`);
  console.log(`📧 For account: ${user.email} (expires in 24 hours)`);
  console.log(`======================================================\n`);

  sendVerificationLink(user.email, user.name, link).catch((err) =>
    console.error("Could not send verification email:", err.message)
  );

  res.json({
    message: `Verification code and link sent to ${user.email}! Please check your email inbox.`,
  });
}

// POST /api/auth/verify-email-otp  { code } (needs requireAuth) - Verifies 6-digit OTP
export async function verifyEmailOtp(req, res) {
  const { code } = clean(req.body);
  if (!code || code.length !== 6) {
    return res.status(400).json({ message: "Please enter the 6-digit verification code." });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  // Try Neon Auth OTP verify
  const neon = await callNeonAuth("email-otp/verify-email", {
    email: user.email,
    otp: code,
  });

  if (!neon.ok && neon.data?.message) {
    return res.status(400).json({
      message: neon.data.message || "Invalid or expired verification code.",
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

// GET /api/auth/verify-email?token=...  (Public verification link handler)
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
      message: "This verification link has expired or has already been used. Please request a new one.",
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
