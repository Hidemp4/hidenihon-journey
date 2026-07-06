import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { FONT_JP, FONT_SANS, t } from "./Theme";

const features = [
  { label: "Kana guiado", description: "Hiragana e Katakana com reconhecimento visual." },
  { label: "Progresso leve", description: "Lições curtas que liberam a próxima etapa." },
  { label: "Leitura inicial", description: "Base para identificar símbolos e sons com confiança." },
];

const previewCards = [
  { jp: "あ", label: "Hiragana", color: "#0ea5e9" },
  { jp: "カ", label: "Katakana", color: "#9333ea" },
  { jp: "日", label: "Kanji", color: t.accent },
];

export default function LandingPage() {
  return (
    <main
      className="min-h-screen overflow-hidden px-5 py-6 text-black sm:px-8"
      style={{
        background:
          "radial-gradient(circle at 88% 8%, rgba(223,37,49,0.18), transparent 30%), radial-gradient(circle at 10% 16%, rgba(245,158,11,0.16), transparent 28%), #f6f2ee",
        fontFamily: FONT_SANS,
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3" aria-label="HideNihon inicio">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm" style={{ background: t.accent }}>
              <span className="text-3xl text-white" style={{ fontFamily: FONT_JP }}>日</span>
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">
                Hide<span style={{ color: t.accent }}>Nihon</span>
              </p>
              <p className="text-xs font-semibold tracking-[0.18em] text-black/60" style={{ fontFamily: FONT_JP }}>日本語学習</p>
            </div>
          </Link>

          <Link
            to="/login"
            className="rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
          >
            Entrar
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/85 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black/70 shadow-sm backdrop-blur">
              <Sparkles size={14} style={{ color: t.accent }} />
              Japonês sem sobrecarga
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-black sm:text-6xl lg:text-7xl">
              Aprenda japonês em uma jornada visual, simples e progressiva.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-black/70 sm:text-lg">
              O HideNihon organiza seus primeiros passos no japonês com módulos curtos,
              desbloqueio por progresso e uma experiência feita para estudar todos os dias.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-xl shadow-red-900/10 transition hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: t.accent }}
              >
                Começar agora
                <ArrowRight size={18} />
              </Link>
              <a
                href="#metodo"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-6 py-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Ver método
                <BookOpen size={18} />
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3" id="metodo">
              {features.map(feature => (
                <div key={feature.label} className="rounded-3xl border border-black/10 bg-white/72 p-4 shadow-sm backdrop-blur">
                  <CheckCircle2 size={18} style={{ color: t.accent }} />
                  <h2 className="mt-3 text-sm font-black">{feature.label}</h2>
                  <p className="mt-1 text-xs font-medium leading-5 text-black/65">{feature.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative mx-auto w-full max-w-md lg:max-w-lg"
          >
            <div className="absolute -left-6 top-16 hidden h-24 w-24 rounded-full bg-yellow-300/25 blur-2xl sm:block" />
            <div className="absolute -right-6 bottom-20 hidden h-32 w-32 rounded-full bg-red-500/20 blur-2xl sm:block" />

            <div className="relative rounded-[36px] border border-black/10 bg-white p-4 shadow-2xl shadow-black/10">
              <div className="rounded-[28px] bg-black p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">Preview da jornada</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">Primeiros símbolos</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <LockKeyhole size={20} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {previewCards.map(card => (
                    <div key={card.label} className="rounded-3xl bg-white p-3 text-center text-black">
                      <div className="flex aspect-square items-center justify-center rounded-2xl" style={{ background: `${card.color}18` }}>
                        <span className="text-5xl" style={{ color: card.color, fontFamily: FONT_JP }}>{card.jp}</span>
                      </div>
                      <p className="mt-3 text-xs font-black">{card.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-3xl bg-white/10 p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-white/70">
                    <span>Progresso do módulo</span>
                    <span>34%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[34%] rounded-full" style={{ background: t.accent }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-black/10 p-4">
                  <p className="text-3xl font-black">3</p>
                  <p className="mt-1 text-xs font-bold text-black/65">módulos base</p>
                </div>
                <div className="rounded-3xl border border-black/10 p-4">
                  <p className="text-3xl font-black">1 por vez</p>
                  <p className="mt-1 text-xs font-bold text-black/65">desbloqueio guiado</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
