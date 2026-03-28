import { t, FONT_SANS } from "./Theme";

type Props = { value: string | number; label: string };

export function SummaryCard({ value, label }: Props) {
  return (
    <div style={{ flex: 1, background: t.primary, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 16px" }}>
      <p style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 22, color: t.secondary, letterSpacing: "-0.025em", margin: 0 }}>
        {value}
      </p>
      <p style={{ fontFamily: FONT_SANS, fontSize: 11, color: t.muted, margin: "3px 0 0" }}>
        {label}
      </p>
    </div>
  );
}