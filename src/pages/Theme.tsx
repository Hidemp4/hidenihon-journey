// 60 % — primary (white surfaces)
// 30 % — secondary (black text / dark elements)
// 10 % — accent (Japanese red)

export const FONT_SANS = "'Inter', sans-serif";
export const FONT_JP   = "'Zen Kurenaido', 'KyokaFont', serif";

export const t = {
  primary:     "#ffffff",
  secondary:   "#000000",
  accent:      "#df2531",
  accent65:    "rgba(171,28,38,0.9)",
  accent45:    "rgba(223,37,49,0.45)",
  muted:       "rgba(0,0,0,0.62)",
  border:      "rgba(0,0,0,0.14)",
  surface:     "#f4f1ec",   // off-white for page bg (still primary family)
} as const;
