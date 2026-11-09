// client/src/components/modals/RecycleBinModal.jsx
import { useEffect, useState } from "react";
import {
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import {
  getRecycleBinTrades,
  restoreTradeById,
  restoreAllTrades,
  permanentDeleteTradeById,
  emptyRecycleBin,
} from "../../api/trades";
import { money, prettyDate } from "../../utils/format";

export default function RecycleBinModal({ isOpen, onClose, onTradesChanged }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [busyAll, setBusyAll] = useState(false);

  const fetchBin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getRecycleBinTrades();
      setTrades(data || []);
    } catch (err) {
      setError(err.message || "Failed to load recycle bin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBin();
      setActionMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestore = async (id) => {
    setBusyId(id);
    setActionMsg("");
    try {
      await restoreTradeById(id);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setActionMsg("Trade restored back to Journal!");
      if (onTradesChanged) onTradesChanged();
    } catch (err) {
      setError(err.message || "Could not restore trade");
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (id, coin, trader) => {
    if (!window.confirm(`Permanently delete this ${coin || ""} trade for ${trader || "trader"}? This cannot be undone.`)) {
      return;
    }
    setBusyId(id);
    setActionMsg("");
    try {
      await permanentDeleteTradeById(id);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setActionMsg("Trade permanently deleted.");
      if (onTradesChanged) onTradesChanged();
    } catch (err) {
      setError(err.message || "Could not permanently delete trade");
    } finally {
      setBusyId(null);
    }
  };

  const handleRestoreAll = async () => {
    if (trades.length === 0) return;
    if (!window.confirm(`Restore all ${trades.length} trade(s) back to your Journal?`)) return;
    setBusyAll(true);
    setActionMsg("");
    try {
      await restoreAllTrades();
      setTrades([]);
      setActionMsg("All trades restored back to your Journal!");
      if (onTradesChanged) onTradesChanged();
    } catch (err) {
      setError(err.message || "Could not restore all trades");
    } finally {
      setBusyAll(false);
    }
  };

  const handleEmptyBin = async () => {
    if (trades.length === 0) return;
    if (!window.confirm(`Are you SURE you want to permanently delete all ${trades.length} trade(s)? This CANNOT be undone!`)) {
      return;
    }
    setBusyAll(true);
    setActionMsg("");
    try {
      await emptyRecycleBin();
      setTrades([]);
      setActionMsg("Recycle bin emptied completely.");
      if (onTradesChanged) onTradesChanged();
    } catch (err) {
      setError(err.message || "Could not empty recycle bin");
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div
        className="modal-content-custom"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, width: "100%", maxHeight: "88vh" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(244, 63, 94, 0.15)",
                color: "var(--red)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Trash2 size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                  Recycle Bin
                </h2>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: trades.length > 0 ? "rgba(244, 63, 94, 0.2)" : "var(--surface-subtle)",
                    color: trades.length > 0 ? "var(--red)" : "var(--muted)",
                  }}
                >
                  {trades.length} deleted {trades.length === 1 ? "trade" : "trades"}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Restore deleted trades or remove them permanently
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 8,
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Notifications */}
        {actionMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--green-bg)",
              color: "var(--green-text)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 14,
              border: "1px solid var(--green)",
            }}
          >
            <CheckCircle2 size={16} />
            <span>{actionMsg}</span>
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--red-bg)",
              color: "var(--red-text)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 14,
              border: "1px solid var(--red)",
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Bulk Action Buttons (if trades exist) */}
        {trades.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              padding: "10px 14px",
              background: "var(--surface-subtle)",
              borderRadius: 10,
              border: "1px solid var(--line)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
              Bulk Actions:
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleRestoreAll}
                disabled={busyAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "var(--blue-soft)",
                  color: "var(--blue)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid var(--blue)",
                }}
              >
                <RotateCcw size={13} />
                <span>Restore All</span>
              </button>

              <button
                type="button"
                onClick={handleEmptyBin}
                disabled={busyAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "var(--red-bg)",
                  color: "var(--red)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid var(--red)",
                }}
              >
                <Trash2 size={13} />
                <span>Empty Recycle Bin</span>
              </button>
            </div>
          </div>
        )}

        {/* Content list */}
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <Loader2 size={32} color="var(--blue)" className="animate-spin" style={{ margin: "0 auto 10px" }} />
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading deleted trades…</p>
          </div>
        ) : trades.length === 0 ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              background: "var(--surface-subtle)",
              borderRadius: 12,
              border: "1.5px dashed var(--line)",
            }}
          >
            <Trash2 size={40} color="var(--muted)" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
              Recycle Bin is Empty
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 360, marginInline: "auto" }}>
              When you delete a trade from the journal, it moves here. You can restore it or permanently delete it anytime.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 360,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {trades.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--line)",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <b style={{ fontSize: 14, color: "var(--text)" }}>{t.coinSymbol}</b>
                    <span
                      style={{
                        padding: "1px 7px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: t.side === "buy" ? "var(--green-bg)" : "var(--red-bg)",
                        color: t.side === "buy" ? "var(--green-text)" : "var(--red-text)",
                      }}
                    >
                      {t.side}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: t.amount > 0 ? "var(--green)" : t.amount < 0 ? "var(--red)" : "var(--muted)",
                      }}
                    >
                      {money(t.amount || 0)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 12,
                      color: "var(--muted)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <User size={12} /> {t.trader}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} /> {prettyDate(t.tradeDate)}
                    </span>
                    {t.timeIn && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {t.timeIn}
                      </span>
                    )}
                    {t.remarks && (
                      <span style={{ fontStyle: "italic", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{t.remarks}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Row actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleRestore(t.id)}
                    disabled={busyId === t.id || busyAll}
                    title="Restore trade back to Journal"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 11px",
                      borderRadius: 8,
                      background: "var(--blue-soft)",
                      color: "var(--blue)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid var(--blue)",
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(t.id, t.coinSymbol, t.trader)}
                    disabled={busyId === t.id || busyAll}
                    title="Permanently delete from database"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 11px",
                      borderRadius: 8,
                      background: "transparent",
                      color: "var(--red)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid var(--line)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--red-bg)";
                      e.currentTarget.style.borderColor = "var(--red)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "var(--line)";
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 20, textAlign: "right", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              background: "var(--surface-hover)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid var(--line)",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

