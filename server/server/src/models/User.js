import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // email verification
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, default: "" },
    verificationTokenExpires: { type: Date, default: null },

    // raising this number logs the user out everywhere (used after a password reset)
    tokenVersion: { type: Number, default: 0 },

    // forgot-password code (only a scrambled copy is stored)
    resetCodeHash: { type: String, default: "" },
    resetCodeExpires: { type: Date, default: null },
    resetAttempts: { type: Number, default: 0 },
    resetSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// never send secrets to the browser
userSchema.set("toJSON", {
  transform: (_doc, ret) => ({
    id: ret._id.toString(),
    name: ret.name,
    email: ret.email,
    emailVerified: Boolean(ret.emailVerified),
  }),
});

export default mongoose.model("User", userSchema);