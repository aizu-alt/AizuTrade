// client/src/components/journal/ImportExcel.jsx
import { useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { parseTradesFile, downloadTemplate } from "../../utils/importExcel";
import "./ImportExcel.css";

const num = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 8 });

export default function ImportExcel({ existingTraders = [], onImport, onClose }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const good = rows.filter((r) => r.errors.length === 0);
  const bad = rows.length - good.length;
  const newTraders = [...new Set(good.map((r) => r.trade.trader))].filter((n) => !existingTraders.includes(n));

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setRows([]);
    setFileName(file.name);
    try {
      setRows(await parseTradesFile(file));
    } catch (err) {
      setFileName("");
      setError(err.message);
    }
  };

  const doImport = async () => {
    setBusy(true);
    setError("");
    try {
      await onImport(good.map((r) => r.trade));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="xl">
      <div className="xl-top">
        <p className="xl-help">
          Upload an Excel (.xlsx) or CSV file. Each row becomes one trade. Columns:
          <b> Date, Trader, Coin Symbol, Buy/Sell, Time In, Qty, Entry Price, Target, Result, Closing Date, Closing Time, Amount, Trades, Remarks</b>.
        </p>
        <button type="button" className="xl-link" onClick={downloadTemplate}>
          <Download size={16} /> Download template
        </button>
      </div>

      <div
        className={`xl-drop ${drag ? "drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      >
        {fileName ? <FileSpreadsheet size={28} /> : <Upload size={28} />}
        <p className="xl-drop-title">{fileName || "Click to choose a file, or drag it here"}</p>
        <p className="xl-drop-sub">.xlsx, .xls or .csv, up to 1000 rows</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>

      {error && <div className="xl-error">{error}</div>}

      {rows.length > 0 && (
        <>
          <div className="xl-chips">
            <span className="chip">{rows.length} rows found</span>
            <span className="chip ok">{good.length} ready to import</span>
            {bad > 0 && <span className="chip bad">{bad} with errors (will be skipped)</span>}
            {newTraders.length > 0 && <span className="chip info">New trader{newTraders.length > 1 ? "s" : ""}: {newTraders.join(", ")}</span>}
          </div>

          <div className="xl-table-wrap">
            <table className="xl-table">
              <thead>
                <tr>
                  {["Row", "Date", "Trader", "Coin", "Side", "In", "Qty", "Entry", "Target", "Result", "Close Date", "Out", "Amount", "Trades", "Status"].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map(({ rowNumber, trade: t, errors }) => (
                  <tr key={rowNumber} className={errors.length ? "err" : ""}>
                    <td>{rowNumber}</td>
                    <td>{t.tradeDate || "—"}</td>
                    <td>{t.trader || "—"}</td>
                    <td>{t.coinSymbol || "—"}</td>
                    <td>{t.side || "—"}</td>
                    <td>{t.timeIn || "—"}</td>
                    <td>{t.qty == null ? "—" : num(t.qty)}</td>
                    <td>{t.entryPrice == null ? "—" : num(t.entryPrice)}</td>
                    <td>{t.target ? num(t.target) : "—"}</td>
                    <td>{t.result || "—"}</td>
                    <td>{t.closingDate || "—"}</td>
                    <td>{t.closingTime || "—"}</td>
                    <td>{num(t.amount)}</td>
                    <td>{t.tradesCount}</td>
                    <td className="xl-status">{errors.length ? errors.join("; ") : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && <p className="xl-note">Showing the first 200 rows. All {good.length} valid rows will be imported.</p>}
        </>
      )}

      <div className="jr-modal-actions">
        <button type="button" onClick={onClose} className="jr-btn-ghost">Cancel</button>
        <button type="button" onClick={doImport} disabled={busy || good.length === 0} className="jr-btn-primary">
          {busy ? "Importing…" : good.length ? `Import ${good.length} trade${good.length > 1 ? "s" : ""}` : "Import"}
        </button>
      </div>
    </div>
  );
}