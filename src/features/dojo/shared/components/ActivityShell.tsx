import { useEffect, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DOJO_HUB_ROUTE } from "../constants";
import { ArenaHeader, type ArenaMobileSize } from "./ArenaHeader";
import { AudioToggle } from "./ui";

/**
 * - `header`: cabeçalho com a arena, barra "← Dojô" e título (padrão).
 * - `focus`: sem cabeçalho nem menu flutuante, só o botão de áudio fixo (modo foco durante o treino).
 * - `takeover`: a atividade ocupa a tela inteira (abertura, contagem regressiva).
 */
export type ActivityShellChrome = "header" | "focus" | "takeover";

interface ActivityShellProps {
  activity: { name: string; kanji: string };
  audioEnabled: boolean;
  onToggleAudio: () => void;
  /** Desligue enquanto uma resposta está em andamento: aí o Esc pertence à atividade. */
  escapeToHub?: boolean;
  chrome?: ActivityShellChrome;
  compact?: boolean;
  /** Altura do cabeçalho no celular: ver `ArenaHeader` (`short` no lobby, `battle` com o teclado aberto). */
  mobileHeader?: ArenaMobileSize;
  eyebrow?: ReactNode;
  /** Chamada grande abaixo da barra (vira h2: o h1 da página é o nome da atividade). */
  headline?: ReactNode;
  description?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
}

const backLinkClass =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-white/25 bg-black/45 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-journey-orange/60 hover:text-journey-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/60";

function BackToHubLink() {
  return (
    <Link to={DOJO_HUB_ROUTE} aria-label="Voltar ao Dojô" className={backLinkClass}>
      <ArrowLeft size={16} strokeWidth={2.6} aria-hidden="true" /> Dojô
    </Link>
  );
}

function useEscapeToHub(enabled: boolean) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      // `defaultPrevented`: a atividade já usou esse Esc (ex.: encerrar a sessão), independente da ordem
      // dos listeners. `isComposing`: no IME japonês o Esc cancela a conversão, não é para sair da tela.
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      navigate(DOJO_HUB_ROUTE);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, navigate]);
}

/** Casca comum das atividades do dojô: navegação de volta, título, áudio e o atalho Esc. */
export function ActivityShell({
  activity,
  audioEnabled,
  onToggleAudio,
  escapeToHub = true,
  chrome = "header",
  compact = true,
  mobileHeader = "default",
  eyebrow,
  headline,
  description,
  stats,
  children,
}: ActivityShellProps) {
  const reduceMotion = useReducedMotion() ?? false;
  useEscapeToHub(escapeToHub);

  const audioToggle = <AudioToggle enabled={audioEnabled} onToggle={onToggleAudio} />;

  if (chrome === "takeover") {
    return (
      <div className="relative">
        {children}
        <div className="absolute left-5 top-5 z-20">
          <BackToHubLink />
        </div>
      </div>
    );
  }

  return (
    // Sem o menu flutuante (Trilha / Dojô) dentro das atividades: aqui o "Dojô" ficava aceso em laranja e,
    // no celular, parecia o botão de começar; quem tocava saía da atividade. A saída é o "← Dojô" do topo.
    <div className="journey-home min-h-screen min-h-[100dvh] bg-journey-surface pb-[calc(3rem+env(safe-area-inset-bottom,0px))] font-ui text-journey-ink">
      {chrome === "focus" ? (
        <div className="fixed right-4 top-4 z-20">{audioToggle}</div>
      ) : (
        <ArenaHeader
          compact={compact}
          mobileSize={mobileHeader}
          reduceMotion={reduceMotion}
          bar={
            <div className="flex items-center gap-3">
              <BackToHubLink />
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-lg font-black leading-tight tracking-[-0.02em] [text-shadow:0_2px_0_hsl(var(--journey-forest-deep)/.6)] sm:text-2xl">
                  {activity.name}{" "}
                  <span lang="ja" className="whitespace-nowrap font-jp text-base font-bold text-journey-gold sm:text-lg">
                    {activity.kanji}
                  </span>
                </h1>
                {/* No compacto o status vai junto do título: a linha a menos devolve espaço ao kana no celular. */}
                {compact && eyebrow && (
                  <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-journey-gold">{eyebrow}</p>
                )}
              </div>
              {audioToggle}
            </div>
          }
          eyebrow={compact ? undefined : eyebrow}
          headline={headline}
          headlineAs="h2"
          description={description}
          aside={stats}
        />
      )}

      {children}
    </div>
  );
}
