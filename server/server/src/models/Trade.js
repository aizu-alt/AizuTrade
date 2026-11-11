import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    trader: { type: String, required: true, trim: true },
    tradeDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // "2024-10-24"
    coinSymbol: { type: String, required: true, trim: true, uppercase: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    timeIn: { type: String, required: true }, // "09:42"
    qty: { type: Number, required: true },
    entryPrice: { type: Number, required: true },
    target: { type: Number, default: 0 },
    result: { type: String, enum: ["win", "loss", "open", "breakeven"], default: "open" },
    closingDate: { type: String, default: "", match: /^(|\d{4}-\d{2}-\d{2})$/ },
    closingTime: { type: String, default: "" },
    amount: { type: Number, default: 0 }, // negative for loss
    tradesCount: { type: Number, default: 1, min: 1 },
    remarks: { type: String, default: "" },

    // recycle bin soft-delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tradeSchema.index({ isDeleted: 1, deletedAt: -1 });
tradeSchema.index({ tradeDate: -1, timeIn: 1 });
tradeSchema.index({ trader: 1, tradeDate: -1 });
tradeSchema.index({ coinSymbol: 1 });
tradeSchema.index({ result: 1 });
tradeSchema.index({ side: 1 });

// send "id" to the frontend instead of "_id" / "__v"
tradeSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Trade", tradeSchema);
