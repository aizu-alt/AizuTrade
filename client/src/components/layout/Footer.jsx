// client/src/components/layout/Footer.jsx
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="ft-inner">
        <div className="ft-brand">
          <span className="ft-icon">
            <img
              src="/5.png"
              alt="Aizu Trade logo"
              loading="lazy"
              width={28}
              height={28}
              style={{ borderRadius: 6, objectFit: "contain" }}
            />
          </span>
          <span className="ft-name">
            Aizu <span style={{ color: "var(--blue)", fontWeight: 700 }}>Trade</span>
          </span>
        </div>
        <p className="ft-copy">
          © {new Date().getFullYear()} Aizu Trade · Built with Neon &amp; MongoDB.
        </p>
      </div>
    </footer>
  );
}
