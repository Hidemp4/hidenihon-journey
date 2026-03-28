// Soft Japanese palette — inspired by traditional Japanese pigment names
export const palette = {
  ink: "#2e2a26",
  inkMid: "#7a6e65",
  inkLight: "#b3a89f",
  paper: "#faf8f5",
  paperDark: "#f0ece6",
  surface: "#ffffff",
  beni: "#b85c48",
  beniLight: "#f7ecea",
  border: "rgba(46,42,38,0.09)",
  borderSoft: "rgba(46,42,38,0.06)",
};

export const fonts = {
  sans: "'Inter', sans-serif",
  jp: "'Zen Kurenaido', 'KyokaFont', serif",
};

export const flex = (gap: number = 0) => ({
  display: "flex" as const,
  alignItems: "center" as const,
  gap,
});

export const center = {
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

export const card = {
  borderRadius: 16,
  background: palette.surface,
  border: `1px solid ${palette.border}`,
};

export const pill = {
  fontFamily: fonts.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.02em",
  padding: "2px 8px",
  borderRadius: 99,
};
