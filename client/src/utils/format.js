// client/src/utils/format.js  —  shared formatters (US dollars, dates, times)
const US = "en-US"; // Standard dollar grouping: $124,500.00

export const usd = (n, digits = 2) =>
  "$" + Math.abs(Number(n)).toLocaleString(US, { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const rupee = usd;

// profit / loss with sign:  +$1,240.50   -$320.00   $0.00
export const money = (n) => (n > 0 ? "+" : n < 0 ? "-" : "") + usd(n);

// short form for chart axes: $1.2k, $3.5M, $1.2B
export const compactUSD = (n) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const f = (v, u) => `${sign}$${Number(v.toFixed(1))}${u}`;
  if (a >= 1e9) return f(a / 1e9, "B");
  if (a >= 1e6) return f(a / 1e6, "M");
  if (a >= 1e3) return f(a / 1e3, "k");
  return `${sign}$${Math.round(a)}`;
};

export const compactINR = compactUSD;

// prices can be tiny for coins like PENGU, so allow up to 6 decimals
export const price = (n) =>
  "$" + Number(n).toLocaleString(US, { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export const qtyFmt = (n) => Number(n).toLocaleString(US, { maximumFractionDigits: 8 });

export const time24 = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const shiftDay = (iso, delta) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toISO(d);
};

// Monday of the week that contains this date
export const weekStart = (iso) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISO(d);
};

export const monthStart = (iso) => iso.slice(0, 7) + "-01";

export const prettyDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(US, { day: "2-digit", month: "short", year: "numeric" });

export const dayMonth = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(US, { day: "numeric", month: "short" });

export const monthLabel = (iso) =>
  new Date(iso.slice(0, 7) + "-01T00:00:00").toLocaleDateString(US, { month: "short", year: "numeric" });

export const weekday = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(US, { weekday: "short" });

export const time12 = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
