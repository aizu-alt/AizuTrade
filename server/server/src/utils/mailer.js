import nodemailer from "nodemailer";

const isPlaceholder = (val) =>
  !val ||
  val.includes("youremail@") ||
  val.includes("your-16-letter") ||
  val.includes("your-password") ||
  val.includes("example.com");

const configured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    !isPlaceholder(process.env.SMTP_USER) &&
    !isPlaceholder(process.env.SMTP_PASS)
  );

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true" || port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

export async function sendMail({ to, subject, text, html }) {
  if (!configured()) {
    console.log(`\n======================================================`);
    console.log(`📨 [LOCAL DEV EMAIL - SMTP not configured yet]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`------------------------------------------------------`);
    console.log(text);
    console.log(`======================================================\n`);
    return { dev: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (err) {
    console.warn(`[Mailer Warning] SMTP send failed: ${err.message}. Showing email in console instead:`);
    console.log(`\n======================================================`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`------------------------------------------------------`);
    console.log(text);
    console.log(`======================================================\n`);
    return { dev: true, error: err.message };
  }
}

// 1. Password Reset: Sends 6-digit verification code
export const sendResetCode = (to, name, code) =>
  sendMail({
    to,
    subject: `Your Aizu Trade Password Reset Code: ${code}`,
    text:
      `Hi ${name || "Trader"},\n\n` +
      `Your 6-digit password reset verification code is:\n\n` +
      `   ${code}\n\n` +
      `This code expires in 10 minutes.\n` +
      `Enter this 6-digit code on the reset password screen to update your password.\n\n` +
      `If you did not request this, please ignore this email. Your password will remain unchanged.\n\n` +
      `Best regards,\nAizu Trade Support`,
    html:
      `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">` +
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">` +
      `<h2 style="margin:0;color:#0f172a;font-size:20px">Aizu <span style="color:#4f6ef7">Trade</span></h2>` +
      `</div>` +
      `<p style="color:#334155;font-size:15px">Hi <b>${name || "Trader"}</b>,</p>` +
      `<p style="color:#64748b;font-size:14px;line-height:1.5">You requested to reset your password. Use the 6-digit verification code below to set a new password:</p>` +
      `<div style="margin:24px 0;padding:16px;background:#f5f4ff;border:1.5px dashed #9b6dff;border-radius:10px;text-align:center">` +
      `<span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#4f6ef7">${code}</span>` +
      `</div>` +
      `<p style="color:#94a3b8;font-size:13px">This code expires in <b>10 minutes</b>. If you did not ask for this reset, please ignore this email.</p>` +
      `<hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px;margin:0">Aizu Trade Journal</p>` +
      `</div>`,
  });

// 2. Email Verification: Sends clickable verification link
export const sendVerificationLink = (to, name, link) =>
  sendMail({
    to,
    subject: "Verify your email address - Aizu Trade",
    text:
      `Hi ${name || "Trader"},\n\n` +
      `Please verify your email address for Aizu Trade by clicking the link below:\n\n` +
      `   ${link}\n\n` +
      `This link will expire in 24 hours.\n\n` +
      `Best regards,\nAizu Trade Support`,
    html:
      `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">` +
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">` +
      `<h2 style="margin:0;color:#0f172a;font-size:20px">Aizu <span style="color:#4f6ef7">Trade</span></h2>` +
      `</div>` +
      `<p style="color:#334155;font-size:15px">Hi <b>${name || "Trader"}</b>,</p>` +
      `<p style="color:#64748b;font-size:14px;line-height:1.5">Thank you for joining Aizu Trade! Please click the button below to verify your email address:</p>` +
      `<div style="margin:28px 0;text-align:center">` +
      `<a href="${link}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4f6ef7 0%,#9b6dff 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;box-shadow:0 4px 14px rgba(79,110,247,0.35)">Verify Email Address</a>` +
      `</div>` +
      `<p style="color:#64748b;font-size:13px">Or copy and paste this link into your browser:<br/><a href="${link}" style="color:#4f6ef7;word-break:break-all">${link}</a></p>` +
      `<p style="color:#94a3b8;font-size:13px">This verification link will expire in 24 hours.</p>` +
      `<hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px;margin:0">Aizu Trade Journal</p>` +
      `</div>`,
  });
