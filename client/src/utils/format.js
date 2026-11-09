// client/src/utils/format.js  —  shared formatters (Indian rupees, dates, times)
const IN = "en-IN"; // Indian digit grouping: 1,24,500.00

export const rupee = (n, digits = 2) =>
  "$" + Math.abs(Number(n)).toLocaleString(IN, { minimumFractionDigits: digits, maximumFractionDigits: digits });

// profit / loss with sign:  +$1,240.50   -$320.00   $0.00
export const money = (n) => (n > 0 ? "+" : n < 0 ? "-" : "") + rupee(n);

// short form for chart axes: $1.2k, $3.5L, $1.2Cr
export const compactINR = (n) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const f = (v, u) => `${sign}$${Number(v.toFixed(1))}${u}`;
  if (a >= 1e7) return f(a / 1e7, "Cr");
  if (a >= 1e5) return f(a / 1e5, "L");
  if (a >= 1e3) return f(a / 1e3, "k");
  return `${sign}$${Math.round(a)}`;
};

// prices can be tiny for coins like PENGU, so allow up to 6 decimals
export const price = (n) =>
  "$" + Number(n).toLocaleString(IN, { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export const qtyFmt = (n) => Number(n).toLocaleString(IN, { maximumFractionDigits: 8 });

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
  new Date(iso + "T00:00:00").toLocaleDateString(IN, { day: "2-digit", month: "short", year: "numeric" });

export const dayMonth = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(IN, { day: "numeric", month: "short" });

export const monthLabel = (iso) =>
  new Date(iso.slice(0, 7) + "-01T00:00:00").toLocaleDateString(IN, { month: "short", year: "numeric" });

export const weekday = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(IN, { weekday: "short" });

export const time12 = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};