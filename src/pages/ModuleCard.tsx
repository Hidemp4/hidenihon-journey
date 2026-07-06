import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { type ModuleProgress } from "@/hooks/useProgress";
import { t, FONT_SANS, FONT_JP } from "./Theme";
import { ProgressBar } from "./ProgressBar";

type Module = {
  id: string;
  label: string;
  sublabel: string;
  emoji: string;
  gradient: string;
  topics: string[];
  locked?: boolean;
};

type Props = {
  module: Module;
  index: number;
  percent: number;
  completedLessons: number;
  isLocked: boolean;
  onClick: () => void;
};

export function ModuleCard({ module, index, percent, completedLessons, isLocked, onClick }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      disabled={isLocked}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 14,
        overflow: "hidden",
        background: t.primary,
        border: `1px solid ${t.border}`,
        opacity: isLocked ? 0.62 : 1,
        cursor: isLocked ? "default" : "pointer",
        padding: 0,
      }}
    >
      {/* Accent stripe */}
      <div style={{ height: 3, background: isLocked ? t.border : t.accent45 }} />

      <div style={{ padding: 16 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: isLocked ? t.surface : "rgba(223,37,49,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              {isLocked ? <Lock size={16} color={t.muted} strokeWidth={1.5} /> : module.emoji}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 14, color: t.secondary, letterSpacing: "-0.01em" }}>
                  {module.label}
                </span>
                {isLocked && (
                  <span style={{ fontFamily: FONT_SANS, fontSize: 9, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase" as const, background: t.surface, color: t.muted, padding: "2px 5px", borderRadius: 6 }}>
                    Em breve
                  </span>
                )}
              </div>
              <span style={{ fontFamily: FONT_JP, fontSize: 12, color: isLocked ? t.muted : t.accent65, letterSpacing: "0.04em" }}>
                {module.sublabel}
              </span>
            </div>
          </div>

          <span style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: t.muted }}>
            {completedLessons} lições
          </span>
        </div>

        {!isLocked && <ProgressBar percent={percent} />}

        {/* Topic pills */}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 10 }}>
          {module.topics.slice(0, 4).map((topic) => (
            <span key={topic} style={{ fontFamily: FONT_SANS, fontSize: 10, fontWeight: 600, background: t.surface, color: t.muted, padding: "2px 8px", borderRadius: 99, border: `1px solid ${t.border}` }}>
              {topic}
            </span>
          ))}
          {module.topics.length > 4 && (
            <span style={{ fontFamily: FONT_SANS, fontSize: 10, fontWeight: 600, background: t.surface, color: t.muted, padding: "2px 8px", borderRadius: 99, border: `1px solid ${t.border}` }}>
              +{module.topics.length - 4}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
