import { motion } from "framer-motion";
import { t, FONT_SANS } from "./Theme";

type Props = { percent: number };

export function ProgressBar({ percent }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 99, overflow: "hidden", background: t.border }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", borderRadius: 99, background: t.accent }}
        />
      </div>
      <span style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 500, color: t.muted, width: 32, textAlign: "right" }}>
        {percent}%
      </span>
    </div>
  );
}