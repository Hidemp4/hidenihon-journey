import { BarChart3, BookOpen, Zap } from "lucide-react";
import { NavLink } from "react-router-dom";
import { FONT_SANS } from "@/pages/Theme";

// Ajuste para os tokens reais do seu Theme, se existirem
const brand = {
  orange: "#F97316",
  orangeSoft: "rgba(249,115,22,0.14)",
  forest: "#12201A",
  forestGlass: "rgba(18,32,26,0.78)",
  cream: "#F4ECE0",
  creamMuted: "rgba(244,236,224,0.62)",
  border: "rgba(244,236,224,0.14)",
};

const items = [
  { to: "/home", label: "Trilha", jp: "道", icon: BookOpen },
  { to: "/reaction-time", label: "Reaction", jp: "反応", icon: Zap },
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
        border: `1px solid ${brand.border}`,
        background: brand.forestGlass,
        boxShadow:
          "0 18px 42px rgba(10,20,15,0.38), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        padding: 6,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        fontFamily: FONT_SANS,
      }}
    >
      {items.map(({ to, label, jp, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            textDecoration: "none",
            borderRadius: 999,
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: isActive ? "#fff" : brand.creamMuted,
            background: isActive ? brand.orange : "transparent",
            boxShadow: isActive
              ? "0 8px 20px rgba(249,115,22,0.38)"
              : "none",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            transition: "all 180ms ease",
          })}
        >
          <Icon size={17} strokeWidth={2.4} />
          <span>{label}</span>
          <span
            aria-hidden
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0,
              opacity: 0.7,
            }}
          >
            {jp}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

export function ReactionStatsIcon() {
  return <BarChart3 size={16} strokeWidth={2.4} />;
}