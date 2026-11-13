import Trade from "../models/Trade.js";
import Trader from "../models/Trader.js";

const FIELDS = [
  "trader", "tradeDate", "coinSymbol", "side", "timeIn",
  "qty", "entryPrice", "target", "result", "closingDate", "closingTime", "amount", "tradesCount", "remarks",
];

// copy only the fields we allow from the request body
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/trades?date=2024-10-24&trader=&side=&result=&q=&page=&limit= (Active trades only)
export async function getTrades(req, res) {
  const { date, dateFrom, dateTo, trader, side, result, coin, q, page, limit } = req.query;
  const filter = { isDeleted: { $ne: true } };
  if (date) filter.tradeDate = date;
  if (dateFrom && dateTo) {
    filter.tradeDate = { $gte: dateFrom, $lte: dateTo };
  } else if (dateFrom) {
    filter.tradeDate = { $gte: dateFrom };
  } else if (dateTo) {
    filter.tradeDate = { $lte: dateTo };
  }
  if (trader && trader !== "All") filter.trader = trader;

  if (side && side !== "all") filter.side = side;
  if (result && result !== "all") filter.result = result;
  if (coin && coin !== "all") filter.coinSymbol = coin.toUpperCase();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ coinSymbol: rx }, { remarks: rx }, { trader: rx }];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // Return paginated response if page & limit provided
  if (pageNum > 0 && limitNum > 0) {
    const skip = (pageNum - 1) * limitNum;
    const [trades, total] = await Promise.all([
      Trade.find(filter)
        .sort({ tradeDate: -1, timeIn: 1 })
        .skip(skip)
        .limit(limitNum)
        .select("-__v")
        .lean(),
      Trade.countDocuments(filter),
    ]);

    for (let i = 0; i < trades.length; i++) {
      trades[i].id = trades[i]._id.toString();
    }
    return res.json({
      trades,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  }

  // Non-paginated query
  const trades = await Trade.find(filter)
    .sort({ tradeDate: -1, timeIn: 1 })
    .select("-__v")
    .lean();
  for (let i = 0; i < trades.length; i++) {
    trades[i].id = trades[i]._id.toString();
  }
  res.json(trades);
}

// GET /api/trades/analytics?range=90&mode=week&trader=All
export async function getAnalytics(req, res) {
  const { range = "90", trader } = req.query;
  const match = { isDeleted: { $ne: true } };

  if (trader && trader !== "All") {
    match.trader = trader;
  }

  if (range && range !== "all") {
    const days = parseInt(range, 10);
    if (!isNaN(days) && days > 0) {
      const d = new Date();
      d.setDate(d.getDate() - days);
      match.tradeDate = { $gte: d.toISOString().slice(0, 10) };
    }
  }

  const [aggResult] = await Trade.aggregate([
    { $match: match },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              net: { $sum: "$amount" },
              wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $eq: ["$result", "loss"] }, 1, 0] } },
              open: { $sum: { $cond: [{ $eq: ["$result", "open"] }, 1, 0] } },
              grossWin: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
              grossLoss: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
            },
          },
        ],
        byTrader: [
          {
            $group: {
              _id: "$trader",
              total: { $sum: 1 },
              net: { $sum: "$amount" },
              wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $eq: ["$result", "loss"] }, 1, 0] } },
              open: { $sum: { $cond: [{ $eq: ["$result", "open"] }, 1, 0] } },
            },
          },
          { $sort: { net: -1 } },
        ],
        byCoin: [
          {
            $group: {
              _id: "$coinSymbol",
              total: { $sum: 1 },
              net: { $sum: "$amount" },
              wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $eq: ["$result", "loss"] }, 1, 0] } },
            },
          },
          { $sort: { total: -1 } },
        ],
        trades: [
          {
            $project: {
              _id: 1,
              tradeDate: 1,
              trader: 1,
              coinSymbol: 1,
              result: 1,
              amount: 1,
            },
          },
          { $sort: { tradeDate: 1 } },
        ],
      },
    },
  ]);

  const summaryRaw = aggResult?.summary?.[0] || {
    total: 0,
    net: 0,
    wins: 0,
    losses: 0,
    open: 0,
    grossWin: 0,
    grossLoss: 0,
  };

  const winLossCount = summaryRaw.wins + summaryRaw.losses;
  const winRate = winLossCount > 0 ? Math.round((summaryRaw.wins / winLossCount) * 100) : 0;

  const summary = {
    ...summaryRaw,
    winRate,
  };

  const byTrader = (aggResult?.byTrader || []).map((t) => {
    const wl = t.wins + t.losses;
    return {
      name: t._id || "Unknown",
      total: t.total,
      net: t.net,
      wins: t.wins,
      losses: t.losses,
      open: t.open,
      winRate: wl > 0 ? Math.round((t.wins / wl) * 100) : 0,
    };
  });

  const byCoin = (aggResult?.byCoin || []).map((c) => {
    const wl = c.wins + c.losses;
    return {
      name: c._id || "Unknown",
      total: c.total,
      net: c.net,
      wins: c.wins,
      losses: c.losses,
      winRate: wl > 0 ? Math.round((c.wins / wl) * 100) : 0,
    };
  });

  const trades = (aggResult?.trades || []).map((t) => ({
    id: t._id.toString(),
    tradeDate: t.tradeDate,
    trader: t.trader,
    coinSymbol: t.coinSymbol,
    result: t.result,
    amount: t.amount,
  }));

  res.json({ summary, byTrader, byCoin, trades });
}

// GET /api/trades/export (Optimized endpoint for PDF/Excel exports)
export async function getExportTrades(req, res) {
  const { date, dateFrom, dateTo, trader } = req.query;
  const filter = { isDeleted: { $ne: true } };
  if (date) filter.tradeDate = date;
  if (dateFrom && dateTo) {
    filter.tradeDate = { $gte: dateFrom, $lte: dateTo };
  } else if (dateFrom) {
    filter.tradeDate = { $gte: dateFrom };
  } else if (dateTo) {
    filter.tradeDate = { $lte: dateTo };
  }
  if (trader && trader !== "All") filter.trader = trader;

  const trades = await Trade.find(filter)
    .sort({ tradeDate: -1, timeIn: 1 })
    .select("trader tradeDate coinSymbol side timeIn qty entryPrice target result closingDate closingTime amount tradesCount remarks")
    .lean();

  for (let i = 0; i < trades.length; i++) {
    trades[i].id = trades[i]._id.toString();
  }
  res.json(trades);
}

// POST /api/trades
export async function createTrade(req, res) {
  const trade = await Trade.create(pick(req.body));
  // Background trader upsert so client receives immediate 201 response with created trade
  if (trade.trader) {
    Trader.updateOne({ name: trade.trader }, { name: trade.trader }, { upsert: true }).catch(() => {});
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
