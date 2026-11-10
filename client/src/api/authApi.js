// client/src/api/authApi.js
import { request } from "./http";

export const loginRequest = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const getMe = () => request("/auth/me");

export const forgotRequest = (email) =>
  request("/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });

export const resetRequest = (email, code, password, token) =>
  request("/auth/reset", { method: "POST", body: JSON.stringify({ email, code, password, token }) });

export const sendVerificationRequest = () =>
  request("/auth/send-verification", { method: "POST" });

export const verifyEmailRequest = (token) =>
  request(`/auth/verify-email?token=${encodeURIComponent(token)}`);

export const verifyEmailOtpRequest = (code) =>
  request("/auth/verify-email-otp", { method: "POST", body: JSON.stringify({ code }) });
