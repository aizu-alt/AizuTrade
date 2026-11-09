import Trader from "../models/Trader.js";
import Trade from "../models/Trade.js";

// GET /api/traders  -> ["Anil", "Ravi", "Suresh"]
export async function getTraders(_req, res) {
  const [saved, fromTrades] = await Promise.all([
    Trader.find().select("name").lean(),
    Trade.distinct("trader"),
  ]);
  const names = [...new Set([...saved.map((t) => t.name), ...fromTrades])].filter(Boolean).sort();
  res.json(names);
}

// GET /api/traders/detailed  -> [{ name: "Anil", tradeCount: 15 }, ...]
export async function getDetailedTraders(_req, res) {
  const [saved, fromTrades, counts] = await Promise.all([
    Trader.find().select("name").lean(),
    Trade.distinct("trader"),
    Trade.aggregate([{ $group: { _id: "$trader", count: { $sum: 1 } } }]),
  ]);
  const allNames = [...new Set([...saved.map((t) => t.name), ...fromTrades])].filter(Boolean).sort();
  const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  const list = allNames.map((name) => ({
    name,
    tradeCount: countMap[name] || 0,
  }));

  res.json(list);
}

// POST /api/traders  { name }
export async function addTrader(req, res) {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Trader name is required" });
  await Trader.updateOne({ name }, { name }, { upsert: true });
  res.status(201).json({ name, message: `Trader "${name}" added successfully` });
}

// DELETE /api/traders/:name  (?deleteTrades=true)
export async function deleteTrader(req, res) {
  const name = decodeURIComponent(req.params.name || "").trim();
  if (!name) return res.status(400).json({ message: "Trader name is required" });

  const deleteTrades = req.query.deleteTrades === "true";

  // Remove from Trader collection
  await Trader.deleteOne({ name });

  let deletedTradesCount = 0;
  if (deleteTrades) {
    const r = await Trade.deleteMany({ trader: name });
    deletedTradesCount = r.deletedCount || 0;
  }

  res.json({
    message: `Trader "${name}" deleted${deletedTradesCount > 0 ? ` along with ${deletedTradesCount} trades` : ""}.`,
    name,
    deletedTradesCount,
  });
}
