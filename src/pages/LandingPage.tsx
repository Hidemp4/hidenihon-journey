import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Leaf,
  Play,
  Sparkles,
  Target,
  Trophy,
  Volume2,
} from "lucide-react";
import { Link } from "react-router-dom";

const learningPath = [
  { kana: "あ", label: "Reconheça", detail: "Associe forma e som" },
  { kana: "か", label: "Pratique", detail: "Responda sem pressão" },
  { kana: "日", label: "Avance", detail: "Libere novos desafios" },
];

const benefits = [
  "Sessões que cabem na rotina",
  "Progresso salvo automaticamente",
  "Conteúdo liberado passo a passo",
];

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
      };

  return (
    <main className="min-h-screen overflow-hidden bg-journey-surface font-ui text-journey-ink">
      <div className="relative border-b border-journey-wood/10 bg-journey-sand">
        <div className="journey-leaf-pattern absolute inset-0 opacity-20" />
        <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link to="/" className="flex items-center gap-3" aria-label="HideNihon início">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-journey-forest-deep text-white shadow-[0_0_0_4px_hsl(var(--journey-orange)/.16)]">
              <Leaf size={20} strokeWidth={2.6} />
            </div>
            <div>
              <p className="font-display text-lg font-black leading-none tracking-[-0.04em]">HideNihon</p>
              <p className="mt-1 font-jp text-[9px] font-bold tracking-[0.2em] text-journey-leaf">日本語の道</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Navegação principal">
            <a href="#como-funciona" className="hidden rounded-full px-4 py-2 text-xs font-extrabold text-journey-ink/60 transition hover:bg-white/50 hover:text-journey-ink sm:inline-flex">
              Como funciona
            </a>
            <Link to="/login" className="inline-flex min-h-11 items-center rounded-full bg-journey-forest-deep px-5 text-xs font-extrabold text-white transition hover:bg-journey-forest active:scale-95">
              Entrar
            </Link>
          </nav>
        </header>
      </div>

      <section className="relative px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="absolute left-[-6rem] top-12 font-jp text-[20rem] font-black leading-none text-journey-forest/[0.025]" aria-hidden="true">旅</div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="relative z-10"
          >
            <div className="inline-flex rotate-[-2deg] items-center gap-2 border border-journey-orange/25 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-journey-orange shadow-[3px_3px_0_hsl(var(--journey-orange)/.14)]">
              <Sparkles size={14} /> Seu japonês começa pequeno
            </div>
            <h1 className="mt-7 max-w-2xl font-display text-5xl font-black leading-[0.9] tracking-[-0.065em] sm:text-7xl lg:text-[5.8rem]">
              Um símbolo.<br />Uma descoberta.<br /><span className="text-journey-orange">Todo dia.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-semibold leading-7 text-journey-ink/65 sm:text-lg">
              Uma trilha visual para quem quer aprender japonês sem se perder entre listas, regras e excesso de conteúdo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-journey-orange px-7 text-sm font-black text-white shadow-[0_14px_30px_hsl(var(--journey-orange)/.25)] transition hover:-translate-y-1 hover:bg-journey-orange-hover active:scale-[0.98]">
                Começar gratuitamente
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#experiencia" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-journey-wood/15 bg-white/60 px-6 text-sm font-black transition hover:bg-white active:scale-[0.98]">
                <Play size={17} fill="currentColor" /> Ver por dentro
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {benefits.map((benefit) => (
                <span key={benefit} className="flex items-center gap-2 text-xs font-bold text-journey-ink/55">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-journey-leaf/10 text-journey-leaf"><Check size={12} strokeWidth={3} /></span>
                  {benefit}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, rotate: 1 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-2xl pb-8 pt-4"
          >
            <div className="absolute -right-3 top-0 z-20 rotate-6 rounded-sm bg-journey-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-journey-wood shadow-md sm:right-5">
              Caderno de viagem · 01
            </div>
            <div className="relative ml-auto w-[88%] rotate-[2deg] overflow-hidden rounded-[2rem] border-[10px] border-white bg-journey-forest-deep shadow-[0_30px_70px_hsl(var(--journey-wood)/.24)] sm:w-[82%]">
              <img src="/narutohome.jpg" alt="Paisagem inspirada na Vila da Folha" className="aspect-[4/5] w-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-journey-forest-deep/80 via-transparent to-transparent" />
              <p className="absolute bottom-5 left-5 right-5 font-jp text-sm font-bold tracking-[0.16em] text-white">最初の一歩 · O primeiro passo</p>
            </div>
            <div className="absolute bottom-0 left-0 z-10 w-[43%] -rotate-6 overflow-hidden rounded-[1.5rem] border-[7px] border-white bg-white shadow-[0_22px_45px_hsl(var(--journey-wood)/.22)]">
              <img src="/tanjirohome-card.webp" alt="Personagem em uma jornada de aprendizado" className="aspect-[4/5] w-full object-cover object-top" />
            </div>
            <div className="absolute left-[30%] top-[18%] z-20 grid h-20 w-20 -rotate-12 place-items-center rounded-full border-4 border-journey-sand bg-journey-orange font-jp text-4xl font-black text-white shadow-xl sm:h-24 sm:w-24 sm:text-5xl">学</div>
          </motion.div>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-journey-wood/10 bg-white/60 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal} transition={{ duration: 0.55 }} className="grid gap-6 lg:grid-cols-[.65fr_1.35fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-journey-orange">O caminho HideNihon</p>
              <h2 className="mt-3 font-display text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">Do estranho ao familiar.</h2>
            </div>
            <p className="max-w-2xl text-sm font-semibold leading-6 text-journey-ink/55 lg:justify-self-end sm:text-base">
              Você não recebe tudo de uma vez. O conteúdo aparece na ordem certa, com espaço para reconhecer, repetir e realmente lembrar.
            </p>
          </motion.div>

          <div className="relative mt-14 grid gap-4 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-12 hidden border-t-2 border-dashed border-journey-orange/25 md:block" aria-hidden="true" />
            {learningPath.map((step, index) => (
              <motion.article key={step.label} {...reveal} transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.1 }} className="relative rounded-[2rem] border border-journey-wood/10 bg-journey-sand p-6 text-center shadow-[0_14px_35px_hsl(var(--journey-wood)/.08)]">
                <span className="absolute left-5 top-5 text-[10px] font-black tracking-[0.16em] text-journey-orange">0{index + 1}</span>
                <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-journey-forest-deep font-jp text-5xl font-black text-journey-gold shadow-lg">{step.kana}</div>
                <h3 className="mt-6 font-display text-xl font-black">{step.label}</h3>
                <p className="mt-2 text-sm font-semibold text-journey-ink/50">{step.detail}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="experiencia" className="relative px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <motion.div {...reveal} transition={{ duration: 0.55 }}>
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-journey-leaf"><Target size={16} /> Dentro do treinamento</span>
            <h2 className="mt-4 font-display text-4xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">Menos distração.<br />Mais prática.</h2>
            <p className="mt-6 max-w-lg text-sm font-semibold leading-6 text-journey-ink/60 sm:text-base">
              Cada tela tem uma função clara. Você aprende o símbolo, escuta o som, responde e vê sua evolução — sem menus competindo pela atenção.
            </p>
            <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl bg-journey-forest-deep p-4 text-white"><Clock3 size={18} className="text-journey-gold" /><p className="mt-4 text-2xl font-black">5–10 min</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">por sessão</p></div>
              <div className="rounded-2xl bg-journey-orange p-4 text-white"><Trophy size={18} /><p className="mt-4 text-2xl font-black">1 passo</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">de cada vez</p></div>
            </div>
          </motion.div>

          <motion.div {...reveal} transition={{ duration: 0.65, delay: reduceMotion ? 0 : 0.1 }} className="relative rounded-[2.5rem] bg-journey-forest-deep p-4 shadow-[0_30px_70px_hsl(var(--journey-forest-deep)/.2)] sm:p-7">
            <div className="rounded-[1.9rem] bg-journey-sand p-5 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-journey-orange">Exercício 04 de 08</p><h3 className="mt-2 font-display text-xl font-black sm:text-2xl">Qual é o som deste kana?</h3></div>
                <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-journey-forest shadow-sm" aria-label="Ouvir pronúncia"><Volume2 size={20} /></button>
              </div>
              <div className="my-8 grid place-items-center rounded-[2rem] border border-journey-wood/10 bg-white py-10 shadow-inner sm:py-14"><span className="font-jp text-8xl font-black text-journey-ink sm:text-9xl">か</span></div>
              <div className="grid grid-cols-2 gap-3">
                {["ka", "ki", "ku", "ke"].map((answer, index) => <div key={answer} className={`rounded-2xl border px-4 py-3 text-center text-sm font-black ${index === 0 ? "border-journey-orange bg-journey-orange text-white" : "border-journey-wood/10 bg-white text-journey-ink/65"}`}>{answer}</div>)}
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-journey-wood/10"><div className="h-full w-1/2 rounded-full bg-journey-orange" /></div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <motion.div {...reveal} transition={{ duration: 0.6 }} className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-journey-orange px-6 py-14 text-center text-white shadow-[0_24px_60px_hsl(var(--journey-orange)/.22)] sm:px-12 sm:py-16">
          <div className="absolute -left-8 -top-12 font-jp text-[12rem] font-black text-white/[0.08]" aria-hidden="true">始</div>
          <div className="relative">
            <p className="font-jp text-xs font-bold tracking-[0.18em] text-journey-sand">準備はいいですか？</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-black leading-none tracking-[-0.055em] sm:text-6xl">Seu primeiro símbolo está esperando.</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm font-semibold leading-6 text-white/80 sm:text-base">Crie sua conta e comece sem compromisso. A jornada cresce junto com você.</p>
            <Link to="/login" className="group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-journey-forest-deep px-7 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-journey-forest active:scale-[0.98]">
              Criar minha conta <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-journey-wood/10 px-5 py-8 text-center sm:px-8">
        <p className="font-jp text-[10px] font-bold tracking-[0.16em] text-journey-leaf">一歩ずつ、夢に近づく</p>
        <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-journey-ink/35">HideNihon · Japonês, um passo de cada vez</p>
      </footer>
    </main>
  );
}
