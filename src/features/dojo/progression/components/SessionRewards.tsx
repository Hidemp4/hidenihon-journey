import { ArrowDown, ArrowUp, ChevronRight, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import type { ActivityId } from "../../registry";
import { describeReward, divisionChange, formatSigned, OUTCOME_LABELS, trophiesText, unrankedText } from "../copy";
import { levelFor } from "../ladder";
import type { SessionSummary } from "../match";
import type { SessionReward } from "../rewards";
import { SESSION_COMPLETE_XP } from "../rules";
import { RANKING_ROUTE } from "../routes";
import { useSessionReward } from "../useProgression";

const OUTCOME_TONE = {
  win: "text-journey-orange",
  draw: "text-journey-ink",
  loss: "text-journey-wood",
} as const;

function Banner({ tone, icon, children }: { tone: "up" | "down"; icon: "arrow" | "spark"; children: string }) {
  const Icon = icon === "spark" ? Sparkles : tone === "up" ? ArrowUp : ArrowDown;
  return (
    <p
      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-black ${
        tone === "up" ? "border-journey-gold/70 bg-journey-gold/20 text-journey-ink" : "border-journey-wood/25 bg-white text-journey-ink"
      }`}
    >
      <Icon size={16} strokeWidth={2.6} aria-hidden="true" className={tone === "up" ? "text-journey-orange" : "text-journey-wood"} />
      {children}
    </p>
  );
}

function RewardDetails({ reward }: { reward: SessionReward }) {
  const { match } = reward;
  const change = divisionChange(reward);
  const level = levelFor(reward.after.xp).level;

  return (
    <section aria-label="Recompensas da sessão" className="mt-5 rounded-2xl border-2 border-journey-wood/15 bg-journey-sand/70 p-4 text-left">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-journey-wood/10 bg-white px-3 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood">Troféus</p>
          {match.ranked ? (
            <>
              <p className={`mt-1 flex items-center gap-1.5 font-display text-3xl font-black leading-none ${OUTCOME_TONE[match.outcome]}`}>
                <Trophy size={22} strokeWidth={2.6} aria-hidden="true" />
                {formatSigned(match.trophies)}
              </p>
              <p className="mt-1.5 text-xs font-bold text-journey-ink/80">
                {OUTCOME_LABELS[match.outcome]} · desempenho {match.performance} (meta {match.meta})
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 font-display text-3xl font-black leading-none text-journey-ink/60">—</p>
              <p className="mt-1.5 text-xs font-bold text-journey-ink/80">Treino sem troféus</p>
            </>
          )}
        </div>
        <div className="rounded-xl border-2 border-journey-wood/10 bg-white px-3 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood">XP</p>
          <p className="mt-1 font-display text-3xl font-black leading-none text-journey-ink">{formatSigned(reward.xp)}</p>
          <p className="mt-1.5 text-xs font-bold text-journey-ink/80">
            Nível {level} · {trophiesText(reward.after.trophies)}
          </p>
        </div>
      </div>

      {"reason" in match && <p className="mt-3 text-xs font-semibold text-journey-ink/80">{unrankedText(match.reason, reward.activity)}</p>}

      {(change || reward.levelUp) && (
        <div className="mt-3 space-y-2">
          {change && (
            <Banner tone={change.up ? "up" : "down"} icon="arrow">
              {change.up ? `${change.newLeague ? "Nova liga" : "Subiu"}: ${change.label}!` : `Caiu para ${change.label}`}
            </Banner>
          )}
          {reward.levelUp && (
            <Banner tone="up" icon="spark">
              {`Nível ${reward.levelUp}!`}
            </Banner>
          )}
        </div>
      )}

      {reward.xpLines.length > 0 && (
        <ul aria-label="De onde veio o XP" className="mt-3 space-y-1">
          {reward.xpLines.map((line, index) => (
            <li key={`${line.source}-${index}`} className="flex justify-between gap-3 text-xs font-semibold text-journey-ink/80">
              <span>{line.label}</span>
              <span className="font-black text-journey-ink">+{line.xp}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to={RANKING_ROUTE}
        className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-xl px-1 text-sm font-black text-journey-ink underline decoration-journey-orange decoration-2 underline-offset-4 transition hover:text-journey-orange focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40"
      >
        Ver ranking <ChevronRight size={16} strokeWidth={2.6} aria-hidden="true" />
      </Link>
    </section>
  );
}

/**
 * Troféus e XP de uma sessão, na tela de resultado. Aparece quando a atividade grava (logo depois de
 * a tela abrir); o anúncio para o leitor de tela fica sempre montado.
 */
export function SessionRewards({ activity, sessionId }: { activity: ActivityId; sessionId: string }) {
  const reward = useSessionReward(activity, sessionId);

  return (
    <>
      {/* `aria-live` sem `role="status"`: a tela de resultado de cada atividade já tem o seu status. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="session-rewards-announcement">
        {reward ? describeReward(reward) : ""}
      </p>
      {reward && <RewardDetails reward={reward} />}
    </>
  );
}

/**
 * Pergaminhos: o resumo ainda deixa desfazer a última nota, então a sessão só é gravada ao sair.
 * Aqui vai a prévia do XP certo (prática + sessão concluída); os bônus do dia entram ao gravar.
 */
export function PracticeXpPreview({ summary }: { summary: Pick<SessionSummary, "practiceXp" | "completed"> }) {
  const xp = summary.practiceXp + (summary.completed ? SESSION_COMPLETE_XP : 0);

  return (
    <section aria-label="XP da sessão" className="mt-5 rounded-2xl border-2 border-journey-wood/15 bg-journey-sand/70 p-4 text-left">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood">XP</p>
      <p className="mt-1 font-display text-3xl font-black leading-none text-journey-ink">{formatSigned(xp)}</p>
      <p className="mt-2 text-xs font-semibold text-journey-ink/80">
        {unrankedText("self-graded", "scrolls")} Bônus do dia e da missão entram quando você sai do resumo.
      </p>
    </section>
  );
}
