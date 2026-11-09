// client/src/components/layout/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Users,
  Key,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  User,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import TradersModal from "../modals/TradersModal";
import UpdatePasswordModal from "../modals/UpdatePasswordModal";
import SettingsModal from "../modals/SettingsModal";
import RecycleBinModal from "../modals/RecycleBinModal";

const NAV_ITEMS = [
  { label: "Journal", to: "/journal" },
  { label: "Analysis", to: "/analytics" },
];

function useIsMobile(breakpoint = 820) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}

export default function AizuTradeNavbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Modals state
  const [tradersOpen, setTradersOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);

  useEffect(() => {
    const handleOpenBin = () => setRecycleBinOpen(true);
    window.addEventListener("recyclebin:open", handleOpenBin);
    return () => window.removeEventListener("recyclebin:open", handleOpenBin);
  }, []);

  const accountRef = useRef(null);

  // Close dropdown on click outside or escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) =>
      accountRef.current &&
      !accountRef.current.contains(e.target) &&
      setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    setMenuOpen(false);
    logout();
  };

  const navStyles = {
    header: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--surface)",
      borderBottom: "1px solid var(--line)",
      boxShadow: "var(--shadow-sm)",
      backdropFilter: "blur(12px)",
      transition: "background 0.25s, border-color 0.25s",
    },
    bar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      minHeight: isMobile ? 60 : 68,
      padding: "0 clamp(16px, 5vw, 60px)",
    },
    brand: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: "-0.3px",
      color: "var(--text)",
    },
    mark: {
      display: "grid",
      placeItems: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--brand-gradient)",
      color: "#fff",
      fontWeight: 800,
      boxShadow: "var(--brand-glow)",
    },
    links: {
      display: "flex",
      alignItems: "center",
      gap: 32,
      alignSelf: "stretch",
    },
    link: {
      display: "flex",
      alignItems: "center",
      height: "100%",
      color: "var(--muted)",
      fontSize: 15,
      fontWeight: 600,
      borderBottom: "2px solid transparent",
      marginBottom: -1,
      transition: "color 0.15s, border-color 0.15s",
    },
    linkActive: {
      color: "var(--blue)",
      borderBottomColor: "var(--blue)",
    },
    right: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    profileBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px 6px 6px",
      borderRadius: 999,
      background: "var(--surface-subtle)",
      border: "1px solid var(--line)",
      color: "var(--text)",
      cursor: "pointer",
      transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "var(--brand-gradient)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 700,
      fontSize: 13,
      boxShadow: "var(--brand-glow)",
      flexShrink: 0,
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 10px)",
      right: 0,
      width: 290,
      padding: "14px",
      borderRadius: "var(--radius)",
      background: "var(--surface-card)",
      border: "1px solid var(--line)",
      boxShadow: "var(--shadow-lg)",
      zIndex: 60,
      animation: "slideUp 0.15s ease-out",
    },
    menuItem: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      padding: "10px 12px",
      borderRadius: 9,
      background: "transparent",
      color: "var(--text)",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      textAlign: "left",
      transition: "background 0.12s",
    },
  };

  const getDesktopLink = ({ isActive }) => ({
    ...navStyles.link,
    ...(isActive ? navStyles.linkActive : {}),
  });

  return (
    <>
      <header style={navStyles.header}>
        <div style={navStyles.bar}>
          {/* Brand */}
          <Link
            to="/journal"
            style={navStyles.brand}
            onClick={() => setMenuOpen(false)}
          >
            {logoFailed ? (
              <span style={navStyles.mark}>A</span>
            ) : (
              <img
                src="/5.png"
                alt="Aizu Trade logo"
                width={36}
                height={36}
                style={{ borderRadius: 8, objectFit: "contain" }}
                onError={() => setLogoFailed(true)}
              />
            )}
            <span>
              Aizu{" "}
              <span style={{ color: "var(--purple)", fontWeight: 700 }}>
                Trade
              </span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          {!isMobile && (
            <nav style={navStyles.links} aria-label="Main Navigation">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} style={getDesktopLink}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Right Action Area */}
          <div style={navStyles.right}>
            {/* Profile Dropdown */}
            <div style={{ position: "relative" }} ref={accountRef}>
              <button
                type="button"
                aria-label="User profile menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                style={navStyles.profileBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-hover)";
                  e.currentTarget.style.borderColor = "var(--blue)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface-subtle)";
                  e.currentTarget.style.borderColor = "var(--line)";
                }}
              >
                <div style={navStyles.avatar}>
                  {user?.name ? (
                    user.name.slice(0, 1).toUpperCase()
                  ) : (
                    <User size={16} />
                  )}
                </div>
                {!isMobile && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {user?.name || "Account"}
                  </span>
                )}
                <span
                  style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}
                >
                  ⌄
                </span>
              </button>

              {open && (
                <div style={navStyles.dropdown} role="menu">
                  {user ? (
                    <>
                      {/* User Header */}
                      <div
                        style={{
                          padding: "8px 10px 14px",
                          borderBottom: "1px solid var(--line)",
                          marginBottom: 8,
                        }}
                      >
                        {/* Avatar row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              ...navStyles.avatar,
                              width: 40,
                              height: 40,
                              fontSize: 16,
                            }}
                          >
                            {user.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 15,
                                color: "var(--text)",
                              }}
                            >
                              {user.name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--muted)",
                                wordBreak: "break-all",
                              }}
                            >
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`badge-neon ${
                            user.emailVerified ? "verified" : "unverified"
                          }`}
                        >
                          {user.emailVerified ? (
                            <>
                              <CheckCircle size={10} /> Verified
                            </>
                          ) : (
                            "Email not verified"
                          )}
                        </span>
                      </div>

                      {/* Menu Items */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        {/* 1. Add & Manage Traders */}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpen(false);
                            setTradersOpen(true);
                          }}
                          style={navStyles.menuItem}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--blue-soft)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: "var(--blue-soft)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Users size={15} color="var(--blue)" />
                          </span>
                          <span>Add &amp; Manage Traders</span>
                        </button>

                        {/* 2. Update Password */}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpen(false);
                            setPasswordOpen(true);
                          }}
                          style={navStyles.menuItem}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--purple-soft)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: "var(--purple-soft)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Key size={15} color="var(--purple)" />
                          </span>
                          <span>Update Password</span>
                        </button>

                        {/* 3. Settings */}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpen(false);
                            setSettingsOpen(true);
                          }}
                          style={navStyles.menuItem}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--lavender-soft)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: "var(--lavender-soft)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Settings size={15} color="var(--lavender-dark)" />
                          </span>
                          <span>Settings</span>
                        </button>

                        {/* 4. Recycle Bin */}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpen(false);
                            setRecycleBinOpen(true);
                          }}
                          style={navStyles.menuItem}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(244, 63, 94, 0.12)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: "rgba(244, 63, 94, 0.15)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={15} color="var(--red)" />
                          </span>
                          <span>Recycle Bin</span>
                        </button>

                        {/* 4. Dark / Light Toggle */}
                        <div
                          role="menuitem"
                          tabIndex={0}
                          onClick={toggleTheme}
                          onKeyDown={(e) =>
                            e.key === "Enter" && toggleTheme()
                          }
                          style={{
                            ...navStyles.menuItem,
                            justifyContent: "space-between",
                            cursor: "pointer",
                            borderTop: "1px solid var(--line-light)",
                            marginTop: 4,
                            paddingTop: 10,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--surface-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background:
                                  theme === "dark"
                                    ? "var(--amber-bg)"
                                    : "var(--blue-soft)",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              {theme === "dark" ? (
                                <Sun size={15} color="var(--amber)" />
                              ) : (
                                <Moon size={15} color="var(--blue)" />
                              )}
                            </span>
                            <span>
                              {theme === "dark" ? "Light Mode" : "Dark Mode"}
                            </span>
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 9px",
                              borderRadius: 999,
                              background:
                                theme === "dark"
                                  ? "var(--amber-bg)"
                                  : "var(--blue-soft)",
                              color:
                                theme === "dark"
                                  ? "var(--amber-text)"
                                  : "var(--blue)",
                            }}
                          >
                            {theme === "dark" ? "Dark" : "Light"}
                          </span>
                        </div>

                        {/* 5. Logout */}
                        <div
                          style={{
                            borderTop: "1px solid var(--line)",
                            marginTop: 6,
                            paddingTop: 6,
                          }}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleLogout}
                            style={{
                              ...navStyles.menuItem,
                              color: "var(--red)",
                              fontWeight: 600,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "var(--red-bg)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <LogOut size={16} />
                            <span>Log out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: 13,
                          color: "var(--muted)",
                        }}
                      >
                        Sign in to access your journal.
                      </p>
                      <Link
                        to="/login"
                        onClick={() => setOpen(false)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px",
                          borderRadius: 8,
                          background: "var(--brand-gradient)",
                          color: "#fff",
                          fontWeight: 600,
                          textAlign: "center",
                          fontSize: 14,
                        }}
                      >
                        Login
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            {isMobile && (
              <button
                type="button"
                aria-label="Toggle menu"
                onClick={() => setMenuOpen((m) => !m)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobile && menuOpen && (
          <nav
            style={{
              padding: "12px clamp(16px, 5vw, 60px) 16px",
              background: "var(--surface)",
              borderTop: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  display: "block",
                  padding: "10px 12px",
                  borderRadius: 9,
                  fontSize: 15,
                  fontWeight: 600,
                  background: isActive ? "var(--blue-soft)" : "transparent",
                  color: isActive ? "var(--blue)" : "var(--text)",
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Modals */}
      <TradersModal
        isOpen={tradersOpen}
        onClose={() => setTradersOpen(false)}
        onTraderChange={() => {
          window.dispatchEvent(new Event("traders:updated"));
        }}
      />
      <UpdatePasswordModal
        isOpen={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenTraders={() => setTradersOpen(true)}
      />
      <RecycleBinModal
        isOpen={recycleBinOpen}
        onClose={() => setRecycleBinOpen(false)}
        onTradesChanged={() => {
          window.dispatchEvent(new Event("trades:updated"));
        }}
      />
    </>
  );
}
