// client/src/pages/Analytics.jsx  —  weekly / monthly / trader-wise analysis with charts & DB aggregation
import { Component, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { useAnalytics, useTraders } from "../api/trades";
import { money, compactUSD, dayMonth, monthLabel, prettyDate, weekStart } from "../utils/format";
import { PageSkeleton } from "../components/common/Skeleton";
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
  const net = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return {
    total: list.length, wins, losses, open, net,
    winRate: wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0,
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
        <YAxis {...axis} tickFormatter={compactUSD} width={64} />
        <Tooltip content={<MoneyTip />} cursor={{ fill: "rgba(37, 99, 235, 0.06)" }} />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <Bar dataKey="net" name="Net P&L" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((d) => <Cell key={d.name} fill={d.net >= 0 ? GREEN : RED} />)}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

/* ---------- the main analytics component ---------- */
export default function Analytics() {
  const [mode, setMode] = useState("week"); // week | month
  const [range, setRange] = useState("all");
  const [trader, setTrader] = useState("All");

  const { data: tradersList } = useTraders();
  const traderOptions = useMemo(() => {
    return Array.isArray(tradersList) ? tradersList : [];
  }, [tradersList]);

  // Server-side pre-aggregated analytics query via TanStack Query
  const { data, isLoading, isError, error, refetch } = useAnalytics({
    range,
    trader: trader === "All" ? undefined : trader,
  });

  const total = data?.summary || { total: 0, net: 0, wins: 0, losses: 0, open: 0, winRate: 0 };
  const byTraderRaw = data?.byTrader || [];
  const byCoinRaw = data?.byCoin || [];
  const rows = data?.trades || [];

  const byTrader = useMemo(
    () => byTraderRaw.map((t) => ({ ...t, label: t.name, long: t.name })),
    [byTraderRaw]
  );

  const byCoin = useMemo(
    () => byCoinRaw.slice(0, 12).map((c) => ({ ...c, label: c.name, long: c.name })),
    [byCoinRaw]
  );

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

  const split = useMemo(() => [
    { name: "Win", value: total.wins, color: GREEN },
    { name: "Loss", value: total.losses, color: RED },
    { name: "Open", value: total.open, color: AMBER },
    { name: "Breakeven", value: Math.max(0, total.total - total.wins - total.losses - total.open), color: GREY },
  ].filter((s) => s.value > 0), [total]);

  // every trader's net for each week / month
  const traderNamesInRows = byTrader.map((t) => t.name);
  const traderByPeriod = useMemo(
    () =>
      periods.map((p) => {
        const row = { name: p.name, label: p.label, long: p.long };
        traderNamesInRows.forEach((n) => {
          row[n] = Math.round(p.rows.filter((t) => t.trader === n).reduce((s, t) => s + (Number(t.amount) || 0), 0) * 100) / 100;
        });
        return row;
      }),
    [periods, traderNamesInRows.join("|")] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const unit = mode === "week" ? "week" : "month";

  if (isError) {
    return (
      <main className="analytics">
        <div className="an-card an-state">
          <p className="an-state-title error">Could not load analytics</p>
          <p>{error?.message || "Server error"}</p>
          <button className="an-btn" onClick={() => refetch()}>Try again</button>
        </div>
      </main>
    );
  }

  if (isLoading && !data) {
    return (
      <main className="analytics">
        <PageSkeleton />
      </main>
    );
  }

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
            {traderOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {total.total === 0 ? (
        <div className="an-card an-state">
          <p className="an-state-title">No trades in this period</p>
          <p>Try a longer range or a different trader, or add trades from the Journal page.</p>
        </div>
      ) : (
        <>
          <div className="an-kpis">
            <div className="an-card an-kpi"><span>Net P&amp;L</span><b className={tone(total.net)}>{money(total.net)}</b></div>
            <div className="an-card an-kpi"><span>Win rate</span><b>{total.winRate}%</b><small>{total.wins} wins · {total.losses} losses</small></div>
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
                  <YAxis {...axis} tickFormatter={compactUSD} width={64} />
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
                  <YAxis {...axis} tickFormatter={compactUSD} width={64} />
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
