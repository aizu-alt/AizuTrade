import Trade from "../models/Trade.js";
import Trader from "../models/Trader.js";

const FIELDS = [
  "trader", "tradeDate", "coinSymbol", "side", "timeIn",
  "qty", "entryPrice", "target", "result", "closingTime", "amount", "tradesCount", "remarks",
];

// copy only the fields we allow from the request body
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/trades?date=2024-10-24&trader=&side=&result=&q= (Active trades only)
export async function getTrades(req, res) {
  const { date, trader, side, result, q } = req.query;
  const filter = { isDeleted: { $ne: true } };
  if (date) filter.tradeDate = date;
  if (trader && trader !== "All") filter.trader = trader;

  if (side && side !== "all") filter.side = side;
  if (result && result !== "all") filter.result = result;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ coinSymbol: rx }, { remarks: rx }, { trader: rx }];
  }
  const trades = await Trade.find(filter)
    .sort({ tradeDate: -1, timeIn: 1 })
    .select("-__v")
    .lean();
  for (let i = 0; i < trades.length; i++) {
    trades[i].id = trades[i]._id.toString();
  }
  res.json(trades);
}

// POST /api/trades
export async function createTrade(req, res) {
  const trade = await Trade.create(pick(req.body));
  if (trade.trader) {
    await Trader.updateOne({ name: trade.trader }, { name: trade.trader }, { upsert: true });
  }
  res.status(201).json(trade);
}

// PUT /api/trades/:id
export async function updateTrade(req, res) {
  const trade = await Trade.findByIdAndUpdate(req.params.id, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!trade) return res.status(404).json({ message: "Trade not found" });
  if (trade.trader) {
    await Trader.updateOne({ name: trade.trader }, { name: trade.trader }, { upsert: true });
  }
  res.json(trade);
}

// DELETE /api/trades/:id  (Soft delete: moves to Recycle Bin)
export async function deleteTrade(req, res) {
  const trade = await Trade.findById(req.params.id);
  if (!trade) return res.status(404).json({ message: "Trade not found" });

  trade.isDeleted = true;
  trade.deletedAt = new Date();
  await trade.save();

  res.json({
    id: req.params.id,
    trader: trade.trader,
    message: "Trade moved to Recycle Bin.",
  });
}

// GET /api/trades/recycle-bin  (List deleted trades)
export async function getRecycleBin(_req, res) {
  const trades = await Trade.find({ isDeleted: true })
    .sort({ deletedAt: -1 })
    .select("-__v")
    .lean();

  for (let i = 0; i < trades.length; i++) {
    trades[i].id = trades[i]._id.toString();
  }
  res.json(trades);
}

// POST /api/trades/:id/restore  (Restore a trade from Recycle Bin)
export async function restoreTrade(req, res) {
  const trade = await Trade.findById(req.params.id);
  if (!trade) return res.status(404).json({ message: "Trade not found" });

  trade.isDeleted = false;
  trade.deletedAt = null;
  await trade.save();

  if (trade.trader) {
    await Trader.updateOne({ name: trade.trader }, { name: trade.trader }, { upsert: true });
  }

  res.json({
    id: trade.id,
    message: "Trade restored successfully.",
    trade,
  });
}

// POST /api/trades/recycle-bin/restore-all  (Restore all trades from Recycle Bin)
export async function restoreAllTrades(_req, res) {
  const count = await Trade.countDocuments({ isDeleted: true });
  if (count === 0) return res.json({ message: "Recycle bin is already empty.", restoredCount: 0 });

  await Trade.updateMany({ isDeleted: true }, { $set: { isDeleted: false, deletedAt: null } });

  // Re-sync all active traders
  const activeTraders = await Trade.distinct("trader", { isDeleted: false });
  if (activeTraders.length > 0) {
    await Trader.bulkWrite(
      activeTraders.map((name) => ({ updateOne: { filter: { name }, update: { name }, upsert: true } }))
    );
  }

  res.json({ message: `Restored ${count} trade(s) from Recycle Bin.`, restoredCount: count });
}

// DELETE /api/trades/:id/permanent  (Permanently delete trade)
export async function permanentDeleteTrade(req, res) {
  const trade = await Trade.findByIdAndDelete(req.params.id);
  if (!trade) return res.status(404).json({ message: "Trade not found" });

  const traderName = trade.trader;
  let traderAutoDeleted = false;
  if (traderName) {
    const remainingCount = await Trade.countDocuments({ trader: traderName });
    if (remainingCount === 0) {
      await Trader.deleteOne({ name: traderName });
      traderAutoDeleted = true;
    }
  }

  res.json({
    id: req.params.id,
    trader: traderName,
    traderAutoDeleted,
    message: "Trade permanently deleted.",
  });
}

// DELETE /api/trades/recycle-bin/empty  (Empty the entire Recycle Bin permanently)
export async function emptyRecycleBin(_req, res) {
  const result = await Trade.deleteMany({ isDeleted: true });

  // Check if any traders now have 0 remaining trades
  const activeTraders = await Trade.distinct("trader");
  await Trader.deleteMany({ name: { $nin: activeTraders } });

  res.json({
    message: `Recycle bin emptied. Permanently deleted ${result.deletedCount || 0} trade(s).`,
    deletedCount: result.deletedCount || 0,
  });
}

// POST /api/trades/bulk   { trades: [ ... ] }   (used by the Excel import)
export async function bulkCreateTrades(req, res) {
  const list = Array.isArray(req.body.trades) ? req.body.trades : [];
  if (list.length === 0) return res.status(400).json({ message: "No trades to import" });
  if (list.length > 1000) return res.status(400).json({ message: "Import up to 1000 rows at a time" });

  const docs = list.map((row) => new Trade(pick(row)));
  const problems = [];
  docs.forEach((doc, i) => {
    const err = doc.validateSync();
    if (err) problems.push(`Row ${i + 1}: ${Object.values(err.errors).map((e) => e.message).join(", ")}`);
  });
  if (problems.length) return res.status(400).json({ message: problems.slice(0, 5).join(" | ") });

  await Trade.insertMany(docs);
  const names = [...new Set(docs.map((d) => d.trader))].filter(Boolean);
  if (names.length > 0) {
    await Trader.bulkWrite(
      names.map((name) => ({ updateOne: { filter: { name }, update: { name }, upsert: true } }))
    );
  }
  res.status(201).json({ inserted: docs.length });
}
