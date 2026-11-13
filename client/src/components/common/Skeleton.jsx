// Skeleton loaders with animated gradient shimmer
import "./Skeleton.css";

export function Skeleton({ width, height, borderRadius = 6, className = "", style = {} }) {
  return (
    <div
      className={`az-skeleton ${className}`}
      style={{
        width: width !== undefined ? width : "100%",
        height: height !== undefined ? height : "1rem",
        borderRadius,
        ...style,
      }}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="az-page-skeleton" style={{ maxWidth: 1200, margin: "24px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Skeleton width="180px" height="32px" borderRadius={8} />
        <Skeleton width="120px" height="36px" borderRadius={8} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Skeleton height="88px" borderRadius={10} />
        <Skeleton height="88px" borderRadius={10} />
        <Skeleton height="88px" borderRadius={10} />
        <Skeleton height="88px" borderRadius={10} />
      </div>
      <Skeleton height="360px" borderRadius={12} />
    </div>
  );
}

export function TableRowSkeleton({ cols = 8 }) {
  return (
    <tr className="az-skeleton-row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "12px 14px" }}>
          <Skeleton height="18px" width={i === 0 ? "80%" : "60%"} />
        </td>
      ))}
    </tr>
  );
}
