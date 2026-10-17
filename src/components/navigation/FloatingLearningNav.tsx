import { BarChart3, BookOpen, Zap } from "lucide-react";
import { NavLink } from "react-router-dom";
import { FONT_SANS, t } from "@/pages/Theme";

const items = [
  { to: "/home", label: "Trilha", icon: BookOpen },
  { to: "/reaction-time", label: "Reaction", icon: Zap },
];

export function FloatingLearningNav() {
  return (
    <nav
      aria-label="Alternar área de estudo"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
        zIndex: 50,
        width: "min(420px, calc(100vw - 32px))",
        borderRadius: 999,
        border: `1px solid ${t.border}`,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 18px 42px rgba(0,0,0,0.16)",
        backdropFilter: "blur(14px)",
        padding: 6,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        fontFamily: FONT_SANS,
      }}
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            textDecoration: "none",
            borderRadius: 999,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: isActive ? t.primary : t.secondary,
            background: isActive ? t.secondary : "transparent",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            transition: "all 160ms ease",
          })}
        >
          <Icon size={17} strokeWidth={2.4} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function ReactionStatsIcon() {
  return <BarChart3 size={16} strokeWidth={2.4} />;
}
