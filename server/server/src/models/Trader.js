import mongoose from "mongoose";

const traderSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
});

export default mongoose.model("Trader", traderSchema);
