// client/src/utils/exportTrades.js  —  download trades as Excel (.xlsx) or PDF
import * as XLSX from "xlsx";
import { prettyDate, weekday } from "./format";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const byDateTime = (a, b) => a.tradeDate.localeCompare(b.tradeDate) || (a.timeIn || "").localeCompare(b.timeIn || "");

export function summarize(list) {
  const wins = list.filter((t) => t.result === "win").length;
  const losses = list.filter((t) => t.result === "loss").length;
  const open = list.filter((t) => t.result === "open").length;
  const net = list.reduce((s, t) => s + (t.amount || 0), 0);
  return { total: list.length, wins, losses, open, net, winRate: wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0 };
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------------- Excel ---------------- */
// Same column names as the Excel upload template, so an exported file can be imported again.
export function exportExcel(trades, fileBase = "aizu-trades") {
  const list = [...trades].sort(byDateTime);
  const head = ["Date", "Trader", "Coin Symbol", "Buy/Sell", "Time In", "Qty", "Entry Price", "Target", "Result", "Closing Time", "Amount", "Trades", "Remarks"];
  const rows = list.map((t) => [
    t.tradeDate, t.trader, t.coinSymbol, cap(t.side), t.timeIn || "", t.qty, t.entryPrice, t.target || "",
    cap(t.result), t.closingTime || "", t.amount, t.tradesCount, t.remarks || "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  ws["!cols"] = [12, 14, 13, 10, 9, 12, 13, 12, 11, 13, 13, 8, 40].map((wch) => ({ wch }));
  // number formats for the money columns
  rows.forEach((_, i) => {
    [6, 7, 10].forEach((c) => {
      const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c })];
      if (cell && typeof cell.v === "number") cell.z = c === 10 ? "#,##0.00" : "0.00####";
    });
  });

  // second sheet: totals for every date
  const days = new Map();
  list.forEach((t) => days.set(t.tradeDate, [...(days.get(t.tradeDate) || []), t]));
  const daily = [["Date", "Day", "Trades", "Wins", "Losses", "Open", "Win Rate %", "Net Amount"]];
  [...days.entries()].forEach(([d, items]) => {
    const s = summarize(items);
    daily.push([d, weekday(d), s.total, s.wins, s.losses, s.open, s.winRate, s.net]);
  });
  const all = summarize(list);
  daily.push(["TOTAL", "", all.total, all.wins, all.losses, all.open, all.winRate, all.net]);
  const ws2 = XLSX.utils.aoa_to_sheet(daily);
  ws2["!cols"] = [12, 8, 9, 8, 9, 8, 11, 14].map((wch) => ({ wch }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trades");
  XLSX.utils.book_append_sheet(wb, ws2, "Daily summary");
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}

/* ---------------- PDF ---------------- */
// The standard PDF fonts cannot draw the $ sign, so the PDF writes "Rs." instead.
const inr = (n, signed = false) => {
  const a = Math.abs(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "-" : signed && n > 0 ? "+" : "") + "Rs. " + a;
};
// prices keep up to 6 decimals because coins like PENGU can be very cheap
const pr = (n) => "Rs. " + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const num = (n, max = 6) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: max });

export async function exportPdf(trades, { subtitle = "" } = {}, fileBase = "aizu-trades") {
  // loaded only when needed, so the app starts faster
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const list = [...trades].sort(byDateTime).reverse(); // newest date first
  const sum = summarize(list);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Aizu Trades - Trade Report", 10, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(subtitle || "All data", 10, 20);
  doc.text(`Generated ${prettyDate(todayISO())}`, pageW - 10, 14, { align: "right" });
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Trades: ${sum.total}    Wins: ${sum.wins}    Losses: ${sum.losses}    Open: ${sum.open}    Win rate: ${sum.winRate}%    Net P&L: ${inr(sum.net, true)}`,
    10, 27
  );

  // group by date: a coloured heading row, then that day's trades
  const groups = [];
  list.forEach((t) => {
    const g = groups[groups.length - 1];
    if (g && g.date === t.tradeDate) g.items.push(t);
    else groups.push({ date: t.tradeDate, items: [t] });
  });

  const body = [];
  groups.forEach((g) => {
    const s = summarize(g.items);
    const items = [...g.items].sort((a, b) => (a.timeIn || "").localeCompare(b.timeIn || ""));
    body.push([{
      content: `${prettyDate(g.date)} (${weekday(g.date)})  -  ${s.total} trade${s.total > 1 ? "s" : ""}  -  Net ${inr(s.net, true)}`,
      colSpan: 12,
      styles: { fillColor: [226, 232, 240], fontStyle: "bold", textColor: [15, 23, 42] },
    }]);
    items.forEach((t) =>
      body.push([
        t.trader, t.coinSymbol, cap(t.side), t.timeIn || "-", num(t.qty, 8), pr(t.entryPrice),
        t.target ? pr(t.target) : "-", cap(t.result), t.closingTime || "-", inr(t.amount, true), t.tradesCount, t.remarks || "",
      ])
    );
  });

  autoTable(doc, {
    startY: 31,
    head: [["Trader", "Coin", "Side", "Time In", "Qty", "Entry", "Target", "Result", "Closing", "Amount", "Trades", "Remarks"]],
    body,
    theme: "grid",
    margin: { left: 10, right: 10, bottom: 14 },
    styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 20 }, 2: { cellWidth: 14 }, 3: { cellWidth: 16 },
      4: { cellWidth: 20, halign: "right" }, 5: { cellWidth: 24, halign: "right" }, 6: { cellWidth: 24, halign: "right" },
      7: { cellWidth: 17 }, 8: { cellWidth: 16 }, 9: { cellWidth: 28, halign: "right" }, 10: { cellWidth: 12, halign: "center" },
    },
    // colour buy/sell, win/loss and the amount
    didParseCell: (d) => {
      if (d.section !== "body" || d.row.raw.length < 12) return;
      const v = String(d.cell.raw).toLowerCase();
      if (d.column.index === 2) d.cell.styles.textColor = v === "buy" ? [21, 128, 61] : [220, 38, 38];
      if (d.column.index === 7) d.cell.styles.textColor = v === "win" ? [21, 128, 61] : v === "loss" ? [220, 38, 38] : [180, 83, 9];
      if (d.column.index === 9) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.textColor = String(d.cell.raw).startsWith("-") ? [220, 38, 38] : String(d.cell.raw).startsWith("+") ? [21, 128, 61] : [100, 116, 139];
      }
    },
  });

  const pages = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageW - 10, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    doc.text("Aizu Trades", 10, doc.internal.pageSize.getHeight() - 6);
  }
  doc.save(`${fileBase}.pdf`);
}