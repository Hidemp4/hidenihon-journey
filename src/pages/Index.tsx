import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MODULE_LIST } from "@/data/modules";
import { useProgress, type ModuleProgress } from "@/hooks/useProgress";
import { useAuthContext } from "@/contexts/auth-context-core";
import { t, FONT_SANS, FONT_JP } from "./Theme";
import { SummaryCard } from "./SummaryCard";
import { ModuleCard } from "./ModuleCard";

function countCompleted(lessons: ModuleProgress["lessons"]) {
  return Object.values(lessons).filter(({ completed }) => completed).length;
}

export default function Index() {
  const navigate = useNavigate();
  const { getModulePercent, progress } = useProgress();
  const { user, logout } = useAuthContext();

  const totalLessons = Object.values(progress).reduce((s, mp) => s + countCompleted(mp.lessons), 0);
  const totalChars   = Object.values(progress).reduce((s, mp) => s + mp.learnedChars, 0);
  const overallPct   = Math.round(MODULE_LIST.reduce((s, m) => s + getModulePercent(m.id), 0) / MODULE_LIST.length);

  return (
    <div style={{ minHeight: "100vh", background: t.surface, fontFamily: FONT_SANS }}>

      {/* ── Header ── */}
      <div style={{ background: t.primary, borderBottom: `1px solid ${t.border}`, padding: "36px 20px 28px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: FONT_JP, fontSize: 26, color: t.primary, lineHeight: 1 }}>日</span>
            </div>
            <div>
              <h1 style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: 20, color: t.secondary, letterSpacing: "-0.025em", margin: 0 }}>
                Hide<span style={{ color: t.accent }}>Nihon</span>
              </h1>
              <p style={{ fontFamily: FONT_JP, fontSize: 11, color: t.muted, margin: "2px 0 0", letterSpacing: "0.06em" }}>
                日本語学習
              </p>
            </div>
          </motion.div>

          {/* Tagline */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <p style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 16, color: t.secondary, letterSpacing: "-0.015em", margin: 0 }}>
              Aprenda Japonês
            </p>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: t.muted, margin: "3px 0 0" }}>
              de maneira simples e leve
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18, background: "rgba(255,255,255,0.72)", border: `1px solid ${t.border}`, borderRadius: 14, padding: "10px 12px" }}>
            <div>
              <p style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 700, color: t.secondary, margin: 0 }}>{user?.name}</p>
              <p style={{ fontFamily: FONT_SANS, fontSize: 10, color: t.muted, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.12em" }}>Usuário local</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
              style={{ border: `1px solid ${t.border}`, background: t.primary, color: t.secondary, borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 700 }}
            >
              Sair
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <SummaryCard value={totalLessons} label="Lições concluídas" />
            <SummaryCard value={totalChars}   label="Caracteres aprendidos" />
          </div>
          <div style={{ marginTop: 10 }}>
            <SummaryCard value={`${overallPct}%`} label="Progresso geral" />
          </div>
        </div>
      </div>

      {/* ── Modules ── */}
      <div style={{ padding: "22px 16px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 480, margin: "0 auto" }}>
        <p style={{ fontFamily: FONT_SANS, fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: t.muted, marginBottom: 2 }}>
          Módulos de aprendizado
        </p>

        {MODULE_LIST.map((module, i) => {
          const mp = progress[module.id];
          return (
            <ModuleCard
              key={module.id}
              module={module}
              index={i}
              percent={getModulePercent(module.id)}
              completedLessons={mp ? countCompleted(mp.lessons) : 0}
              isLocked={Boolean(module.locked && i > 0)}
              onClick={() => navigate(`/module/${module.id}`)}
            />
          );
        })}

        {/* Footer */}
        <p style={{ fontFamily: FONT_SANS, fontSize: 11, color: t.muted, textAlign: "center", marginTop: 4 }}>
          🇯🇵 <strong style={{ color: t.secondary }}>HideNihon</strong> — Aprenda japonês com introdução, identificação e leitura
        </p>
      </div>
    </div>
  );
}
