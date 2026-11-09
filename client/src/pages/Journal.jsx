// client/src/pages/Journal.jsx  —  all trades, grouped by date, with filters and export
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Pencil, Trash2, RotateCcw, X, FileSpreadsheet, ClipboardList,
  Download, FileText, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  getTrades,
  createTrade,
  updateTrade,
  deleteTradeById,
  getTraders,
  bulkCreateTrades,
  getRecycleBinTrades,
} from "../api/trades";
import ImportExcel from "../components/journal/ImportExcel";
import { exportExcel, exportPdf } from "../utils/exportTrades";
import { money, price, time24, toISO, shiftDay, weekStart, monthStart, prettyDate, weekday } from "../utils/format";
import "./Journal.css";
import "./JournalView.css";

/* coins shown in the Coin symbol dropdown of the form */
const COINS = ["PENGU", "ETA"];

/* ---------- small UI pieces ---------- */
const SidePill = ({ side }) => <span className={`jr-pill ${side}`}>{side}</span>;
const ResultBadge = ({ result }) => <span className={`jr-badge ${result}`}>{result}</span>;

const totals = (list) => {
  const wins = list.filter((t) => t.result === "win").length;
  const losses = list.filter((t) => t.result === "loss").length;
  const open = list.filter((t) => t.result === "open").length;
  const net = list.reduce((s, t) => s + t.amount, 0);
  const grossWin = list.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const grossLoss = Math.abs(list.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  return {
    total: list.length, wins, losses, open, net,
    winRate: wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null,
  };
};

/* ---------- Add / Edit modal (form or Excel upload) ---------- */
function TradeFormModal({ initial, defaultDate, defaultTrader, traders = [], saving = false, onSave, onImport, onClose }) {
  const [mode, setMode] = useState("form"); // "form" = one trade, "excel" = upload many
  const [isAddingNewTrader, setIsAddingNewTrader] = useState(false);
  const [newTraderInput, setNewTraderInput] = useState("");

  const [form, setForm] = useState(
    initial ?? {
      trader: defaultTrader || traders[0] || "",
      tradeDate: defaultDate,
      coinSymbol: "",
      side: "buy",
      timeIn: "",
      qty: "",
      entryPrice: "",
      target: "",
      result: "open",
      closingTime: "",
      amount: "",
      tradesCount: 1,
      remarks: "",
    }
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const coinOptions = [...new Set([...COINS, form.coinSymbol].filter(Boolean))];
  const allTraderOptions = [...new Set([...traders, form.trader].filter(Boolean))];

  const submit = (e) => {
    e.preventDefault();
    if (!form.trader) {
      alert("Please select or enter a trader name.");
      return;
    }
    onSave({
      ...form,
      qty: Number(form.qty || 9999),
      entryPrice: Number(form.entryPrice),
      target: Number(form.target),
      amount: Number(form.amount || 0),
      tradesCount: Number(form.tradesCount || 1),
      coinSymbol: form.coinSymbol.toUpperCase(),
    });
  };

  const handleAddNewTrader = (e) => {
    e.preventDefault();
    const name = newTraderInput.trim();
    if (!name) return;
    setForm((f) => ({ ...f, trader: name }));
    setIsAddingNewTrader(false);
    setNewTraderInput("");
  };

  return (
    <div className="jr-overlay">
      <div className={`jr-modal ${mode === "excel" ? "wide" : ""}`}>
        <div className="jr-modal-head">
          <h2 className="jr-modal-title">{initial ? "Edit trade" : "Add trade"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="jr-close"><X size={20} /></button>
        </div>

        {!initial && (
          <div className="jr-modal-tabs">
            <button type="button" className={mode === "form" ? "active" : ""} onClick={() => setMode("form")}>
              <ClipboardList size={16} /> Fill form
            </button>
            <button type="button" className={mode === "excel" ? "active" : ""} onClick={() => setMode("excel")}>
              <FileSpreadsheet size={16} /> Upload Excel
            </button>
          </div>
        )}

        {mode === "excel" ? (
          <ImportExcel existingTraders={traders} onImport={onImport} onClose={onClose} />
        ) : (
          <form onSubmit={submit}>
            <div className="jr-form">
              <div className="jr-field">
                <label>Trader Name</label>
                {!isAddingNewTrader ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      required
                      value={form.trader}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsAddingNewTrader(true);
                        } else {
                          setForm((f) => ({ ...f, trader: e.target.value }));
                        }
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select a trader</option>
                      {allTraderOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="__NEW__">+ Add New Trader...</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewTrader(true)}
                      title="Add a new trader"
                      style={{
                        padding: "0 10px",
                        borderRadius: 8,
                        background: "var(--surface-hover)",
                        border: "1px solid var(--line)",
                        color: "var(--blue)",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Enter new trader name"
                      value={newTraderInput}
                      onChange={(e) => setNewTraderInput(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddNewTrader}
                      style={{
                        padding: "0 12px",
                        borderRadius: 8,
                        background: "var(--brand-gradient)",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewTrader(false);
                        setNewTraderInput("");
                      }}
                      style={{
                        padding: "0 10px",
                        borderRadius: 8,
                        background: "var(--surface-hover)",
                        border: "1px solid var(--line)",
                        color: "var(--muted)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="jr-field">
                <label>Date</label>
                <input type="date" required value={form.tradeDate} onChange={set("tradeDate")} />
              </div>
              <div className="jr-field">
                <label htmlFor="coinSymbol">Coin symbol</label>
                <select id="coinSymbol" required value={form.coinSymbol} onChange={set("coinSymbol")}>
                  <option value="">Select a coin</option>
                  {coinOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="jr-field full">
                <label>Buy / Sell</label>
                <div className="jr-side-toggle">
                  {["buy", "sell"].map((s) => (
                    <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, side: s }))}
                      className={`jr-side-btn ${s} ${form.side === s ? "active" : ""}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="jr-field"><label>Time in</label>
                <input type="time" step="60" required value={form.timeIn} onChange={set("timeIn")} /></div>
              <div className="jr-field"><label>Qty</label>
                <input type="number" step="any" required value={form.qty} onChange={set("qty")} /></div>
              <div className="jr-field"><label>Entry price ($)</label>
                <input type="number" step="any" required value={form.entryPrice} onChange={set("entryPrice")} /></div>
              <div className="jr-field"><label>Target ($)</label>
                <input type="number" step="any" value={form.target} onChange={set("target")} /></div>
              <div className="jr-field"><label>Result</label>
                <select value={form.result} onChange={set("result")}>
                  <option value="open">Open</option><option value="win">Win</option>
                  <option value="loss">Loss</option><option value="breakeven">Breakeven</option>
                </select></div>
              <div className="jr-field"><label>Closing time</label>
                <input type="time" value={form.closingTime} onChange={set("closingTime")} /></div>
              <div className="jr-field"><label>Amount ($, use - for loss)</label>
                <input type="number" step="any" value={form.amount} onChange={set("amount")} /></div>
              <div className="jr-field"><label>Trades</label>
                <input type="number" min="1" value={form.tradesCount} onChange={set("tradesCount")} /></div>
              <div className="jr-field full"><label>Remarks</label>
                <textarea rows={3} value={form.remarks} onChange={set("remarks")} /></div>
            </div>
            <div className="jr-modal-actions">
              <button type="button" onClick={onClose} className="jr-btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="jr-btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const TRADES_CACHE_KEY = "aizu_cached_trades";
const TRADERS_CACHE_KEY = "aizu_cached_traders";

const readSessionJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeSessionJson = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

/* ---------- Journal page ---------- */
export default function Journal({ formOpen, setFormOpen }) {
  // --- data (starts with cached data for instant 0ms initial render) ---
  const [trades, setTrades] = useState(() => readSessionJson(TRADES_CACHE_KEY, []));
  const [traders, setTraders] = useState(() => readSessionJson(TRADERS_CACHE_KEY, []));
  const [loading, setLoading] = useState(() => readSessionJson(TRADES_CACHE_KEY, []).length === 0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(null);

  // --- filters ---
  const [from, setFrom] = useState("");       // "" = no start limit
  const [to, setTo] = useState("");           // "" = no end limit
  const [trader, setTrader] = useState("All");
  const [coin, setCoin] = useState("All");
  const [side, setSide] = useState("all");
  const [result, setResult] = useState("all"); // all | win | loss | open
  const [query, setQuery] = useState("");

  // --- view state ---
  const [collapsed, setCollapsed] = useState(() => new Set()); // dates that are folded
  const [exportOpen, setExportOpen] = useState(false);
  const [scope, setScope] = useState("view");  // view | all | range
  const [rFrom, setRFrom] = useState("");
  const [rTo, setRTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [binCount, setBinCount] = useState(0);
  const exportRef = useRef(null);

  const fetchBinCount = () => {
    getRecycleBinTrades()
      .then((items) => setBinCount(Array.isArray(items) ? items.length : 0))
      .catch(() => {});
  };

  // load trades (newest first) and trader names in parallel
  useEffect(() => {
    let cancelled = false;
    if (trades.length === 0) setLoading(true);
    setError("");

    fetchBinCount();

    Promise.all([
      getTrades({}),
      getTraders(),
    ])
      .then(([tradesData, tradersData]) => {
        if (cancelled) return;
        setTrades(tradesData);
        setTraders(tradersData);
        writeSessionJson(TRADES_CACHE_KEY, tradesData);
        writeSessionJson(TRADERS_CACHE_KEY, tradersData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [refresh]);

  // Listen to trader and trade updates from modals (e.g. Recycle Bin)
  useEffect(() => {
    const handleTradersUpdate = () => {
      getTraders().then((n) => {
        setTraders(n);
        writeSessionJson(TRADERS_CACHE_KEY, n);
      }).catch(() => {});
      setRefresh((n) => n + 1);
    };

    const handleTradesUpdate = () => {
      fetchBinCount();
      setRefresh((n) => n + 1);
    };

    window.addEventListener("traders:updated", handleTradersUpdate);
    window.addEventListener("trades:updated", handleTradesUpdate);
    return () => {
      window.removeEventListener("traders:updated", handleTradersUpdate);
      window.removeEventListener("trades:updated", handleTradesUpdate);
    };
  }, []);

  // close the export menu when you click outside it
  useEffect(() => {
    if (!exportOpen) return;
    const close = (e) => exportRef.current && !exportRef.current.contains(e.target) && setExportOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [exportOpen]);

  const today = toISO(new Date());
  const coinList = useMemo(() => [...new Set([...COINS, ...trades.map((t) => t.coinSymbol)])].sort(), [trades]);
  const traderList = useMemo(() => [...new Set([...traders, ...trades.map((t) => t.trader)])].sort(), [traders, trades]);

  // High-performance single-pass filter: avoids 6 chained arrays + re-sorting
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasFilter = from || to || trader !== "All" || coin !== "All" || side !== "all" || result !== "all" || q;
    if (!hasFilter) return trades;

    return trades.filter((t) => {
      if (from && t.tradeDate < from) return false;
      if (to && t.tradeDate > to) return false;
      if (trader !== "All" && t.trader !== trader) return false;
      if (coin !== "All" && t.coinSymbol !== coin) return false;
      if (side !== "all" && t.side !== side) return false;
      if (result !== "all" && t.result !== result) return false;
      if (q) {
        const symbolMatch = t.coinSymbol?.toLowerCase().includes(q);
        const remarksMatch = t.remarks?.toLowerCase().includes(q);
        const traderMatch = t.trader?.toLowerCase().includes(q);
        if (!symbolMatch && !remarksMatch && !traderMatch) return false;
      }
      return true;
    });
  }, [trades, from, to, trader, coin, side, result, query]);

  // group the visible trades by date (newest date first)
  const groups = useMemo(() => {
    const list = [];
    visible.forEach((t) => {
      const g = list[list.length - 1];
      if (g && g.date === t.tradeDate) g.items.push(t);
      else list.push({ date: t.tradeDate, items: [t] });
    });
    return list.map((g) => ({ ...g, ...totals(g.items) }));
  }, [visible]);

  const sum = useMemo(() => totals(visible), [visible]);

  const filtersActive = from || to || trader !== "All" || coin !== "All" || side !== "all" || result !== "all" || query;
  const clearFilters = () => {
    setFrom(""); setTo(""); setTrader("All"); setCoin("All"); setSide("all"); setResult("all"); setQuery("");
  };

  // quick date buttons
  const preset = (key) => {
    if (key === "all") { setFrom(""); setTo(""); }
    if (key === "today") { setFrom(today); setTo(today); }
    if (key === "week") { setFrom(shiftDay(today, -7)); setTo(today); }
    if (key === "month") { setFrom(monthStart(today)); setTo(today); }
  };
  const activePreset =
    !from && !to ? "all"
    : from === today && to === today ? "today"
    : (from === shiftDay(today, -7) || from === shiftDay(today, -6) || from === weekStart(today)) && to === today ? "week"
    : from === monthStart(today) && to === today ? "month" : "";

  const toggleGroup = (date) =>
    setCollapsed((s) => { const n = new Set(s); n.has(date) ? n.delete(date) : n.add(date); return n; });
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.date));

  // --- export ---
  const exportList =
    scope === "all" ? trades
    : scope === "range" ? trades.filter((t) => inRange(t, rFrom, rTo))
    : visible;

  const scopeLabel =
    scope === "all" ? "All data"
    : scope === "range" ? `${rFrom ? prettyDate(rFrom) : "Start"} to ${rTo ? prettyDate(rTo) : "latest"}`
    : "Current view (filters applied)";

  const run = async (list, format, subtitle, base) => {
    if (!list.length) return alert("There are no trades to export.");
    setExporting(true);
    try {
      if (format === "excel") exportExcel(list, base);
      else await exportPdf(list, { subtitle }, base);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };
  const exportMenu = (format) =>
    run(exportList, format, scopeLabel, `aizu-trades-${scope === "view" ? "view" : scope}-${today}`);
  const exportDay = (g, format) =>
    run(g.items, format, `${prettyDate(g.date)} (${weekday(g.date)})`, `aizu-trades-${g.date}`);

  // --- add / edit / delete ---
  const closeModal = () => { setEditing(null); setFormOpen(false); };

  const saveTrade = async (data) => {
    setSaving(true);
    try {
      if (editing) await updateTrade(editing.id, data);
      else await createTrade(data);
      setRefresh((n) => n + 1);
      closeModal();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const importTrades = async (list) => {
    await bulkCreateTrades(list); // errors show inside the upload panel
    setRefresh((n) => n + 1);
    closeModal();
  };

  const deleteTrade = async (id) => {
    if (!window.confirm("Move this trade to Recycle Bin? You can restore it anytime.")) return;
    try {
      await deleteTradeById(id);
      fetchBinCount();
      setRefresh((n) => n + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <main className="journal">
      {/* toolbar */}
      <div className="jr-toolbar">
        <h1 className="jr-title">Aizu Trade</h1>

        <div className="jr-search">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search coin, trader or remarks" />
        </div>

        <div className="jv-export" ref={exportRef}>
          <button className="jv-export-btn" onClick={() => setExportOpen((o) => !o)} aria-expanded={exportOpen}>
            <Download size={17} /> Export <ChevronDown size={15} />
          </button>
          {exportOpen && (
            <div className="jv-pop">
              <p className="jv-pop-title">What do you want to export?</p>
              <label className="jv-radio">
                <input type="radio" name="scope" checked={scope === "view"} onChange={() => setScope("view")} />
                <span>Current view <small>({visible.length} trades, filters applied)</small></span>
              </label>
              <label className="jv-radio">
                <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} />
                <span>All data <small>({trades.length} trades)</small></span>
              </label>
              <label className="jv-radio">
                <input type="radio" name="scope" checked={scope === "range"} onChange={() => setScope("range")} />
                <span>Date or date range</span>
              </label>
              {scope === "range" && (
                <div className="jv-range">
                  <input type="date" value={rFrom} onChange={(e) => setRFrom(e.target.value)} aria-label="From date" />
                  <span>to</span>
                  <input type="date" value={rTo} onChange={(e) => setRTo(e.target.value)} aria-label="To date" />
                  <small>{exportList.length} trades. For one date, pick the same date in both.</small>
                </div>
              )}
              <div className="jv-pop-actions">
                <button disabled={exporting || !exportList.length} onClick={() => exportMenu("excel")}>
                  <FileSpreadsheet size={16} /> Excel
                </button>
                <button disabled={exporting || !exportList.length} onClick={() => exportMenu("pdf")}>
                  <FileText size={16} /> PDF
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("recyclebin:open"))}
          title="Open Recycle Bin"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 16px",
            borderRadius: 12,
            background: "var(--surface-card)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--red)";
            e.currentTarget.style.color = "var(--red)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.color = "var(--text)";
          }}
        >
          <Trash2 size={16} color="var(--red)" />
          <span>Recycle Bin</span>
          {binCount > 0 && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(244, 63, 94, 0.18)",
                color: "var(--red)",
              }}
            >
              {binCount}
            </span>
          )}
        </button>

        <button onClick={() => setFormOpen(true)} className="jr-add-btn"><Plus size={18} /> Add Trade</button>
      </div>

      {/* filters */}
      <div className="jr-card jv-filters">
        <div className="jv-row">
          <div className="jv-presets">
            {[["all", "All dates"], ["today", "Today"], ["week", "This week"], ["month", "This month"]].map(([k, label]) => (
              <button key={k} onClick={() => preset(k)} className={activePreset === k ? "active" : ""}>{label}</button>
            ))}
          </div>
          <div className="jv-dates">
            <label>From <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>To <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
        </div>

        <div className="jv-row">
          <div className="jv-results">
            {[["all", "All"], ["win", "Win"], ["loss", "Loss"], ["open", "Open"]].map(([k, label]) => (
              <button key={k} onClick={() => setResult(k)} className={`${k} ${result === k ? "active" : ""}`}>{label}</button>
            ))}
          </div>

          <select value={coin} onChange={(e) => setCoin(e.target.value)} className="jr-select" aria-label="Coin symbol">
            <option value="All">Coin: All</option>
            {coinList.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={trader} onChange={(e) => setTrader(e.target.value)} className="jr-select" aria-label="Trader">
            <option value="All">Trader: All</option>
            {traderList.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <select value={side} onChange={(e) => setSide(e.target.value)} className="jr-select" aria-label="Buy or sell">
            <option value="all">Side: All</option>
            <option value="buy">Side: Buy</option>
            <option value="sell">Side: Sell</option>
          </select>

          {filtersActive && (
            <button onClick={clearFilters} className="jr-clear"><RotateCcw size={15} /> Clear filters</button>
          )}
        </div>
      </div>

      {/* totals for what is on screen */}
      {!loading && !error && trades.length > 0 && (
        <div className="jr-card jr-summary">
          <div className="jr-stats">
            <span>Trades: <b>{sum.total}</b> <small className="jv-muted">on {groups.length} day{groups.length === 1 ? "" : "s"}</small></span>
            <span>Wins: <b className="win">{sum.wins}</b> <span className="jr-winrate">{sum.winRate}% win rate</span></span>
            <span>Losses: <b className="loss">{sum.losses}</b></span>
            <span>Open: <b>{sum.open}</b></span>
            <span>Profit factor: <b>{sum.profitFactor === null ? "--" : sum.profitFactor === Infinity ? "∞" : sum.profitFactor.toFixed(2)}</b></span>
          </div>
          <div className="jr-net">
            <div className="jr-net-label">Net P&amp;L</div>
            <div className={`jr-net-value ${sum.net >= 0 ? "pos" : "neg"}`}>{money(sum.net)}</div>
          </div>
        </div>
      )}

      {/* the list */}
      {loading ? (
        <div className="jr-card jr-state"><p className="jr-state-text">Loading trades…</p></div>
      ) : error ? (
        <div className="jr-card jr-state">
          <p className="jr-state-title error">Could not load trades</p>
          <p className="jr-state-text">{error}</p>
          <button onClick={() => setRefresh((n) => n + 1)} className="jr-state-btn">Try again</button>
        </div>
      ) : groups.length === 0 ? (
        <div className="jr-card jr-state">
          <p className="jr-state-title">{trades.length ? "No trades match these filters" : "No trades yet"}</p>
          <p className="jr-state-text">{trades.length ? "Try a different date range, coin or result." : "Add your first trade, or upload an Excel file."}</p>
          {trades.length ? (
            <button onClick={clearFilters} className="jr-state-btn">Clear filters</button>
          ) : (
            <button onClick={() => setFormOpen(true)} className="jr-state-btn">Add Trade</button>
          )}
        </div>
      ) : (
        <>
          <div className="jv-listbar">
            <span>{groups.length} day{groups.length === 1 ? "" : "s"}, newest first</span>
            <button onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.date)))}>
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          </div>

          {groups.map((g) => {
            const folded = collapsed.has(g.date);
            return (
              <section key={g.date} className="jr-card jv-group">
                <header className="jv-group-head" onClick={() => toggleGroup(g.date)}>
                  <div className="jv-group-left">
                    {folded ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    <b className="jv-date">{prettyDate(g.date)}</b>
                    <span className="jr-weekday">{weekday(g.date)}</span>
                    <span className="jv-count">{g.total} trade{g.total === 1 ? "" : "s"}</span>
                    {g.wins > 0 && <span className="jv-mini win">{g.wins} win</span>}
                    {g.losses > 0 && <span className="jv-mini loss">{g.losses} loss</span>}
                    {g.open > 0 && <span className="jv-mini open">{g.open} open</span>}
                  </div>
                  <div className="jv-group-right" onClick={(e) => e.stopPropagation()}>
                    <span className={`jv-net ${g.net > 0 ? "pos" : g.net < 0 ? "neg" : ""}`}>{money(g.net)}</span>
                    <button className="jv-icon" title={`Download ${prettyDate(g.date)} as Excel`} onClick={() => exportDay(g, "excel")} disabled={exporting}>
                      <FileSpreadsheet size={17} />
                    </button>
                    <button className="jv-icon" title={`Download ${prettyDate(g.date)} as PDF`} onClick={() => exportDay(g, "pdf")} disabled={exporting}>
                      <FileText size={17} />
                    </button>
                  </div>
                </header>

                {!folded && (
                  <div className="jr-table-wrap">
                    <table className="jr-table">
                      <thead>
                        <tr>
                          {["Trader", "Coin", "Side", "Time in", "Qty", "Entry Price", "Target", "Result", "Closing Time", "Net amount", "Trades", "Remarks", ""].map((h, i) => <th key={i}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((t) => (
                          <tr key={t.id}>
                            <td className="jv-trader">{t.trader}</td>
                            <td><div className="jr-coin">{t.coinSymbol}</div></td>
                            <td><SidePill side={t.side} /></td>
                            <td>{time24(t.timeIn)}</td>
                            <td>{t.qty.toLocaleString("en-IN")}</td>
                            <td>{price(t.entryPrice)}</td>
                            <td>{t.target ? price(t.target) : "--"}</td>
                            <td><ResultBadge result={t.result} /></td>
                            <td>{time24(t.closingTime)}</td>
                            <td className={`jr-amount ${t.amount > 0 ? "pos" : t.amount < 0 ? "neg" : "zero"}`}>{money(t.amount)}</td>
                            <td>{t.tradesCount}</td>
                            <td className="jr-remarks" title={t.remarks}>{t.remarks}</td>
                            <td>
                              <div className="jr-actions">
                                <button onClick={() => setEditing(t)} aria-label="Edit trade" className="jr-action edit"><Pencil size={16} /></button>
                                <button onClick={() => deleteTrade(t.id)} aria-label="Delete trade" className="jr-action delete"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {(formOpen || editing) && (
        <TradeFormModal
          key={editing ? editing.id : "new"}
          initial={editing}
          defaultDate={from && from === to ? from : today}
          defaultTrader={trader !== "All" ? trader : undefined}
          traders={traderList}
          saving={saving}
          onSave={saveTrade}
          onImport={importTrades}
          onClose={closeModal}
        />
      )}
    </main>
  );
}