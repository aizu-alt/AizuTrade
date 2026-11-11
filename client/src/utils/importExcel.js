// client/src/utils/importExcel.js
// Reads an .xlsx / .xls / .csv file and turns every row into a trade, with errors per row.
import * as XLSX from "xlsx";

export const TEMPLATE_HEADERS = [
  "Date", "Trader", "Coin Symbol", "Buy/Sell", "Time In", "Qty", "Entry Price",
  "Target", "Result", "Closing Date", "Closing Time", "Amount", "Trades", "Remarks",
];

// header names we accept for each field (spaces, case and symbols are ignored)
const ALIASES = {
  tradeDate: ["date", "trade date", "day"],
  trader: ["trader", "trader name", "name", "client"],
  coinSymbol: ["coin symbol", "coin", "symbol", "pair", "coin name"],
  side: ["buy/sell", "buy sell", "side", "type", "direction"],
  timeIn: ["time in", "entry time", "in time", "time", "open time"],
  qty: ["qty", "quantity", "size", "units"],
  entryPrice: ["entry price", "entry", "price", "buy price"],
  target: ["target", "target price", "tp"],
  result: ["result", "status", "outcome"],
  closingDate: ["closing date", "close date", "exit date", "out date", "date out"],
  closingTime: ["closing time", "close time", "exit time", "out time", "time out"],
  amount: ["amount", "net amount", "pnl", "p&l", "p/l", "profit/loss", "profit"],
  tradesCount: ["trades", "no of trades", "no. of trades", "trade count", "count", "# trades"],
  remarks: ["remarks", "remark", "notes", "note", "comments"],
};

const REQUIRED = ["tradeDate", "trader", "coinSymbol", "side", "timeIn", "qty", "entryPrice"];
const LABELS = {
  tradeDate: "Date", trader: "Trader", coinSymbol: "Coin Symbol", side: "Buy/Sell",
  timeIn: "Time In", qty: "Qty", entryPrice: "Entry Price",
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIAS_MAP = {};
Object.entries(ALIASES).forEach(([field, names]) => names.forEach((n) => (ALIAS_MAP[norm(n)] = field)));

const isBlank = (v) => v === "" || v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const pad = (n) => String(n).padStart(2, "0");

/* ---------- cell converters ---------- */
export function toDate(v) {
  if (isBlank(v)) return null;
  let y, m, d;
  if (typeof v === "number") {
    // Excel stores dates as the number of days since 30 Dec 1899
    if (v < 1 || v > 100000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  } else {
    const s = String(v).trim();
    let a;
    if ((a = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) {
      [y, m, d] = [+a[1], +a[2], +a[3]];
    } else if ((a = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) {
      // day first (Indian format): 05/11/2026 = 5 November 2026
      [d, m, y] = [+a[1], +a[2], +a[3]];
      if (y < 100) y += 2000;
    } else {
      const t = new Date(s); // e.g. "5 Nov 2026"
      if (isNaN(t)) return null;
      [y, m, d] = [t.getFullYear(), t.getMonth() + 1, t.getDate()];
    }
  }
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100)) return null;
  const check = new Date(y, m - 1, d);
  if (check.getMonth() !== m - 1) return null; // e.g. 31 Feb
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function toTime(v) {
  if (isBlank(v)) return "";
  if (typeof v === "number") {
    const frac = v - Math.floor(v); // Excel stores time as a fraction of a day
    const mins = Math.round(frac * 1440) % 1440;
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  const a = String(v).trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i);
  if (!a) return null;
  let h = +a[1];
  const min = +a[2];
  if (a[3]) {
    const pm = a[3][0].toLowerCase() === "p";
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (pm ? 12 : 0);
  }
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

export function toNumber(v) {
  if (isBlank(v)) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[$$,\s]/g, "").replace(/[−–]/g, "-");
  const bracket = s.match(/^\((.*)\)$/); // (320) means -320
  if (bracket) s = "-" + bracket[1];
  if (s === "" || isNaN(Number(s))) return null;
  return Number(s);
}

const toSide = (v) => {
  const s = norm(v);
  if (["buy", "b", "long"].includes(s)) return "buy";
  if (["sell", "s", "short"].includes(s)) return "sell";
  return null;
};

const toResult = (v) => {
  const s = norm(v);
  if (["win", "w", "won", "profit"].includes(s)) return "win";
  if (["loss", "l", "lost", "sl"].includes(s)) return "loss";
  if (["open", "o", "running"].includes(s)) return "open";
  if (["breakeven", "be", "bep"].includes(s)) return "breakeven";
  return null;
};

/* ---------- main parser ---------- */
export async function parseTradesFile(file) {
  const isCsv = /\.csv$/i.test(file.name);
  // csv: keep every cell as text so dd/mm/yyyy dates are never misread
  const wb = isCsv
    ? XLSX.read(await file.text(), { type: "string", raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The file has no sheets.");
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

  // find the header row (first row that matches at least 3 known columns)
  let headerIdx = -1;
  let colOf = {};
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const map = {};
    grid[i].forEach((cell, c) => {
      const f = ALIAS_MAP[norm(cell)];
      if (f && map[f] === undefined) map[f] = c;
    });
    if (Object.keys(map).length >= 3) { headerIdx = i; colOf = map; break; }
  }
  if (headerIdx === -1) {
    throw new Error("Could not find the column headings. Use the template: Date, Trader, Coin Symbol, Buy/Sell, Time In, Qty, Entry Price...");
  }
  const missing = REQUIRED.filter((f) => colOf[f] === undefined).map((f) => LABELS[f]);
  if (missing.length) throw new Error(`Missing column(s): ${missing.join(", ")}.`);

  const rows = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const line = grid[i];
    if (line.every(isBlank)) continue; // skip empty rows
    const cell = (f) => (colOf[f] === undefined ? "" : line[colOf[f]]);
    const errors = [];

    const tradeDate = toDate(cell("tradeDate"));
    if (!tradeDate) errors.push("Date missing or invalid");

    const trader = String(cell("trader") ?? "").trim();
    if (!trader) errors.push("Trader missing");

    const coinSymbol = String(cell("coinSymbol") ?? "").trim().toUpperCase();
    if (!coinSymbol) errors.push("Coin symbol missing");

    const side = toSide(cell("side"));
    if (!side) errors.push("Buy/Sell must be Buy or Sell");

    const timeIn = toTime(cell("timeIn"));
    if (!timeIn) errors.push("Time In missing or invalid");

    const qty = toNumber(cell("qty"));
    if (qty === null) errors.push("Qty missing or invalid");

    const entryPrice = toNumber(cell("entryPrice"));
    if (entryPrice === null) errors.push("Entry price missing or invalid");

    const targetRaw = cell("target");
    const target = isBlank(targetRaw) ? 0 : toNumber(targetRaw);
    if (target === null) errors.push("Target is not a number");

    const closingDateRaw = cell("closingDate");
    const closingDate = isBlank(closingDateRaw) ? "" : toDate(closingDateRaw);
    if (closingDate === null) errors.push("Closing date invalid");
    if (tradeDate && closingDate && closingDate < tradeDate) {
      errors.push("Closing date cannot be before Date");
    }

    const closingRaw = cell("closingTime");
    const closingTime = toTime(closingRaw);
    if (closingTime === null) errors.push("Closing time invalid");

    const amountRaw = cell("amount");
    const amount = isBlank(amountRaw) ? 0 : toNumber(amountRaw);
    if (amount === null) errors.push("Amount is not a number");

    const countRaw = cell("tradesCount");
    const tradesCount = isBlank(countRaw) ? 1 : Math.max(1, Math.round(toNumber(countRaw) || 1));

    // result: use the column if given, otherwise work it out from the amount
    const resultRaw = cell("result");
    let result = toResult(resultRaw);
    if (isBlank(resultRaw)) {
      const amt = amount || 0;
      result = amt > 0 ? "win" : amt < 0 ? "loss" : (closingTime || closingDate) ? "breakeven" : "open";
    } else if (!result) {
      errors.push("Result must be Win, Loss, Open or Breakeven");
    }

    rows.push({
      rowNumber: i + 1, // the row number you see in Excel
      errors,
      trade: {
        tradeDate, trader, coinSymbol, side, timeIn, qty, entryPrice,
        target: target ?? 0, result, closingDate: closingDate || "", closingTime: closingTime || "", amount: amount ?? 0,
        tradesCount, remarks: String(cell("remarks") ?? "").trim(),
      },
    });
  }

  if (!rows.length) throw new Error("No trade rows found under the headings.");
  if (rows.length > 1000) throw new Error("This file has more than 1000 rows. Please split it into smaller files.");
  return rows;
}

/* ---------- template download ---------- */
export function downloadTemplate() {
  const today = new Date();
  const next = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const nextIso = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
  const sheet = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    [iso, "Suresh", "PENGU", "Buy", "09:42", 5000, 2.85, 3.1, "Win", iso, "11:15", 1240.5, 2, "Breakout with volume"],
    [iso, "Suresh", "ENA", "Sell", "11:05", 800, 41.2, 38.5, "Loss", nextIso, "11:50", -320, 1, "Closed next day"],
    [iso, "Ravi", "PENGU", "Buy", "14:20", 6000, 2.9, 3.2, "Open", "", "", 0, 1, "Holding"],
  ]);
  sheet["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Trades");
  XLSX.writeFile(wb, "aizu-trades-template.xlsx");
}