import { useEffect, useState } from "react";
import { X, UserPlus, Trash2, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { getDetailedTraders, addTrader, deleteTraderByName } from "../../api/trades";

export default function TradersModal({ isOpen, onClose, onTraderChange }) {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingName, setDeletingName] = useState(null);

  const loadTraders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDetailedTraders();
      setTraders(data);
    } catch (err) {
      setError(err.message || "Could not load traders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTraders();
      setError("");
      setSuccess("");
      setNewName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      await addTrader(name);
      setSuccess(`Trader "${name}" added successfully.`);
      setNewName("");
      await loadTraders();
      if (onTraderChange) onTraderChange();
    } catch (err) {
      setError(err.message || "Failed to add trader");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (name, tradeCount) => {
    let deleteTrades = false;
    if (tradeCount > 0) {
      const confirm = window.confirm(
        `"${name}" currently has ${tradeCount} trade(s).\n\nClick OK to delete trader AND delete their trades.\nClick CANCEL to abort.`
      );
      if (!confirm) return;
      deleteTrades = true;
    } else {
      if (!window.confirm(`Delete trader "${name}"?`)) return;
    }

    setDeletingName(name);
    setError("");
    setSuccess("");
    try {
      await deleteTraderByName(name, deleteTrades);
      setSuccess(`Trader "${name}" removed successfully.`);
      await loadTraders();
      if (onTraderChange) onTraderChange();
    } catch (err) {
      setError(err.message || "Failed to delete trader");
    } finally {
      setDeletingName(null);
    }
  };

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-gradient)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Manage Traders</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Add new traders or remove existing ones
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
              marginBottom: 14,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
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
              marginBottom: 14,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Add trader form */}
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            required
            placeholder="New trader name (e.g. Rahul, Priya)..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--surface-subtle)",
              color: "var(--text)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 10,
              background: "var(--brand-gradient)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "var(--brand-glow)",
              whiteSpace: "nowrap",
            }}
          >
            <UserPlus size={16} />
            {adding ? "Adding…" : "Add"}
          </button>
        </form>

        {/* List of traders */}
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            <span>Traders ({traders.length})</span>
            <span>Trades Count</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 14 }}>
              Loading traders…
            </div>
          ) : traders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--muted)",
                fontSize: 14,
                background: "var(--surface-subtle)",
                borderRadius: 10,
              }}
            >
              No traders yet. Add your first trader above!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {traders.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--blue-soft)",
                        color: "var(--blue)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {t.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: t.tradeCount > 0 ? "var(--green-bg)" : "var(--surface-hover)",
                        color: t.tradeCount > 0 ? "var(--green-text)" : "var(--muted)",
                      }}
                    >
                      {t.tradeCount} trade{t.tradeCount === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      title={`Delete trader ${t.name}`}
                      disabled={deletingName === t.name}
                      onClick={() => handleDelete(t.name, t.tradeCount)}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        background: "transparent",
                        color: "var(--red)",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              background: "var(--surface-hover)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

