// client/src/pages/Analytics.jsx  —  weekly / monthly / trader-wise analysis with charts
import { Component, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { getTrades } from "../api/trades";
import { money, compactINR, toISO, shiftDay, weekStart, dayMonth, monthLabel, prettyDate } from "../utils/format";
import "./Analytics.css";

const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#f59e0b";
const GREY = "#94a3b8";
const PALETTE = ["#2563eb", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#64748b"];

const RANGES = [
  { key: "90", label: "Last 3 months", days: 90 },
  { key: "180", label: "Last 6 months", days: 180 },
  { key: "365", label: "Last 12 months", days: 365 },
  { key: "all", label: "All time", days: null },
];
const MAX_BARS = { week: 26, month: 24 }; // newest periods shown in the bar charts

/* ---------- calculations ---------- */
export function stats(list) {
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
}

const groupBy = (list, keyFn) => {
  const map = new Map();
  list.forEach((t) => {
    const k = keyFn(t);
    map.set(k, [...(map.get(k) || []), t]);
  });
  return [...map.entries()].map(([name, rows]) => ({ name, rows, ...stats(rows) }));
};

const pfText = (pf) => (pf === null ? "--" : pf === Infinity ? "∞" : pf.toFixed(2));
const tone = (n) => (n > 0 ? "pos" : n < 0 ? "neg" : "");

// one bucket per week (Monday start) or per month
const periodOf = (t, mode) => (mode === "week" ? weekStart(t.tradeDate) : t.tradeDate.slice(0, 7));
const periodLabel = (key, mode) => (mode === "week" ? dayMonth(key) : monthLabel(key));
const periodLong = (key, mode) =>
  mode === "week" ? `Week of ${prettyDate(key)}` : monthLabel(key);

/* ---------- small chart pieces ---------- */
function MoneyTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="an-tip">
      <b>{row.long || row.name}</b>
      {payload.map((p) => (
        <div key={p.dataKey} className="an-tip-row">
          <i style={{ background: p.color || p.fill || p.payload?.fill }} />
          {p.name}: <b>{money(p.value)}</b>
        </div>
      ))}
      {row.trades !== undefined && <div className="an-tip-sub">{row.trades} trades · {row.winRate}% win rate</div>}
    </div>
  );
}

function Panel({ title, sub, children, className = "" }) {
  return (
    <div className={`an-card an-panel ${className}`}>
      <h2>{title}</h2>
      {sub && <p className="an-sub">{sub}</p>}
      {children}
    </div>
  );
}

// one chart's error never takes down the whole page
class ChartBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <p className="an-chart-error">This chart could not be drawn: {String(this.state.error.message || this.state.error)}</p>;
  }
}

// the height is set here, so charts show even if Analytics.css did not load
function ChartBox({ height = 300, children }) {
  return (
    <ChartBoundary>
      <div style={{ width: "100%", height, minWidth: 0, marginTop: 14 }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </ChartBoundary>
  );
}

const axis = { tick: { fontSize: 12, fill: "#64748b" }, axisLine: false, tickLine: false };

function NetBars({ data, nameKey = "label" }) {
  return (
    <ChartBox height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey={nameKey} {...axis} interval="preserveStartEnd" />
          <YAxis {...axis} tickFormatter={compactINR} width={64} />
          <Tooltip content={<MoneyTip />} cursor={{ fill: "rgba(37, 99, 235, 0.06)" }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey="net" name="Net P&L" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d) => <Cell key={d.name} fill={d.net >= 0 ? GREEN : RED} />)}
          </Bar>
        </BarChart>
      </ChartBox>
  );
}

/* ---------- the analytics view (takes the trades as a prop) ---------- */
export function AnalyticsView({ all: raw }) {
  // ignore trades with no date, and treat a missing amount as 0
  const all = useMemo(
    () =>
      (raw || [])
        .filter((t) => t && /^\d{4}-\d{2}-\d{2}$/.test(t.tradeDate || ""))
        .map((t) => ({ ...t, amount: Number(t.amount) || 0, trader: t.trader || "Unknown", coinSymbol: t.coinSymbol || "?" })),
    [raw]
  );
  const [mode, setMode] = useState("week"); // week | month
  const [range, setRange] = useState("all");
  const [trader, setTrader] = useState("All");

  const traderNames = useMemo(() => [...new Set(all.map((t) => t.trader))].sort(), [all]);

  const rows = useMemo(() => {
    const days = RANGES.find((r) => r.key === range).days;
    const fromDate = days ? shiftDay(toISO(new Date()), -(days - 1)) : "0000-00-00";
    return all.filter((t) => t.tradeDate >= fromDate && (trader === "All" || t.trader === trader));
  }, [all, range, trader]);

  const total = useMemo(() => stats(rows), [rows]);

  // net P&L per week / month (oldest to newest)
  const allPeriods = useMemo(
    () =>
      groupBy(rows, (t) => periodOf(t, mode))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ ...p, label: periodLabel(p.name, mode), long: periodLong(p.name, mode) })),
    [rows, mode]
  );
  const periods = allPeriods.slice(-MAX_BARS[mode]);
  const cut = allPeriods.length - periods.length;

  // running total over time (per day)
  const curve = useMemo(() => {
    let run = 0;
    return groupBy(rows, (t) => t.tradeDate)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => {
        run += d.net;
        return { name: d.name, label: dayMonth(d.name), long: prettyDate(d.name), net: Math.round(run * 100) / 100, trades: d.total, winRate: d.winRate };
      });
  }, [rows]);

  const split = [
    { name: "Win", value: total.wins, color: GREEN },
    { name: "Loss", value: total.losses, color: RED },
    { name: "Open", value: total.open, color: AMBER },
    { name: "Breakeven", value: total.total - total.wins - total.losses - total.open, color: GREY },
  ].filter((s) => s.value > 0);

  const byTrader = useMemo(
    () => groupBy(rows, (t) => t.trader).sort((a, b) => b.net - a.net).map((t) => ({ ...t, label: t.name, long: t.name })),
    [rows]
  );
  const byCoin = useMemo(
    () => groupBy(rows, (t) => t.coinSymbol).sort((a, b) => b.net - a.net).slice(0, 12).map((c) => ({ ...c, label: c.name, long: c.name })),
    [rows]
  );

  // every trader's net for each week / month (side-by-side bars)
  const traderNamesInRows = byTrader.map((t) => t.name);
  const traderByPeriod = useMemo(
    () =>
      periods.map((p) => {
        const row = { name: p.name, label: p.label, long: p.long };
        traderNamesInRows.forEach((n) => {
          row[n] = Math.round(p.rows.filter((t) => t.trader === n).reduce((s, t) => s + t.amount, 0) * 100) / 100;
        });
        return row;
      }),
    [periods, traderNamesInRows.join("|")] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const unit = mode === "week" ? "week" : "month";

  return (
    <main className="analytics">
      <div className="an-head">
        <h1 className="an-title">Analytics</h1>
        <div className="an-controls">
          <div className="an-segment" role="group" aria-label="Group by">
            <button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Weekly</button>
            <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Monthly</button>
          </div>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="an-select" aria-label="Date range">
            {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <select value={trader} onChange={(e) => setTrader(e.target.value)} className="an-select" aria-label="Trader">
            <option value="All">All traders</option>
            {traderNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="an-card an-state">
          <p className="an-state-title">No trades in this period</p>
          <p>Try a longer range or a different trader, or add trades from the Journal page.</p>
        </div>
      ) : (
        <>
          <div className="an-kpis">
            <div className="an-card an-kpi"><span>Net P&amp;L</span><b className={tone(total.net)}>{money(total.net)}</b></div>
            <div className="an-card an-kpi"><span>Win rate</span><b>{total.winRate}%</b><small>{total.wins} wins · {total.losses} losses</small></div>
            <div className="an-card an-kpi">
              <span>Profit factor</span>
              <b className={total.profitFactor === null ? "" : total.profitFactor >= 1 ? "pos" : "neg"}>{pfText(total.profitFactor)}</b>
            </div>
            <div className="an-card an-kpi"><span>Trades</span><b>{total.total}</b><small>{allPeriods.length} {unit}{allPeriods.length === 1 ? "" : "s"} with trades</small></div>
          </div>

          <Panel title={`Net P&L by ${unit}`} sub={cut > 0 ? `Showing the latest ${periods.length} ${unit}s of ${allPeriods.length}` : "Green = profit, red = loss"}>
            <NetBars data={periods} />
          </Panel>

          <div className="an-grid">
            <Panel title="Cumulative P&L" sub="Running total, day by day">
              <ChartBox height={300}>
                  <LineChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis {...axis} tickFormatter={compactINR} width={64} />
                    <Tooltip content={<MoneyTip />} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Line type="monotone" dataKey="net" name="Total P&L" stroke="#2563eb" strokeWidth={2.5} dot={curve.length < 40} />
                  </LineChart>
                </ChartBox>
            </Panel>

            <Panel title="Win / Loss / Open" sub="Number of trades by result">
              <ChartBox height={300}>
                  <PieChart>
                    <Pie data={split} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
                      {split.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} trades`, n]} />
                    <Legend verticalAlign="bottom" iconType="circle" />
                  </PieChart>
                </ChartBox>
            </Panel>
          </div>

          <div className="an-grid">
            <Panel title="Trader-wise net P&L" sub="Total profit or loss for each trader">
              <NetBars data={byTrader} />
            </Panel>

            <Panel title="Trader summary">
              <div className="an-table-wrap">
                <table className="an-table">
                  <thead><tr><th>Trader</th><th>Trades</th><th>Win rate</th><th>Net P&amp;L</th></tr></thead>
                  <tbody>
                    {byTrader.map((r) => (
                      <tr key={r.name}>
                        <td className="an-name">{r.name}</td>
                        <td>{r.total}</td>
                        <td>{r.winRate}%</td>
                        <td className={`an-num ${tone(r.net)}`}>{money(r.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {byTrader.length > 1 && (
            <Panel title={`Trader-wise by ${unit}`} sub="Each trader's net P&L in every period, side by side">
              <ChartBox height={340}>
                  <BarChart data={traderByPeriod} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
                    <YAxis {...axis} tickFormatter={compactINR} width={64} />
                    <Tooltip content={<MoneyTip />} cursor={{ fill: "rgba(37, 99, 235, 0.06)" }} />
                    <Legend iconType="circle" />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    {traderNamesInRows.map((n, i) => (
                      <Bar key={n} dataKey={n} name={n} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} maxBarSize={28} />
                    ))}
                  </BarChart>
                </ChartBox>
            </Panel>
          )}

          <Panel title="Coin-wise net P&L" sub="Best and worst coins (top 12)">
            <NetBars data={byCoin} />
          </Panel>
        </>
      )}
    </main>
  );
}

/* ---------- page: loads the data, then shows the view ---------- */
const TRADES_CACHE_KEY = "aizu_cached_trades";

const readCachedTrades = () => {
  try {
    const raw = sessionStorage.getItem(TRADES_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function Analytics() {
  const [all, setAll] = useState(readCachedTrades);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    getTrades({})
      .then((data) => {
        if (!cancelled) {
          setAll(data);
          try { sessionStorage.setItem(TRADES_CACHE_KEY, JSON.stringify(data)); } catch {}
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [refresh]);

  if (error) {
    return (
      <main className="analytics">
        <div className="an-card an-state">
          <p className="an-state-title error">Could not load analytics</p>
          <p>{error}</p>
          <button className="an-btn" onClick={() => setRefresh((n) => n + 1)}>Try again</button>
        </div>
      </main>
    );
  }
  if (all === null) {
    return <main className="analytics"><div className="an-card an-state">Loading analytics…</div></main>;
  }
  return <AnalyticsView all={all} />;
}