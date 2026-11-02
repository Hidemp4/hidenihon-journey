import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { strokeTimeline } from "../drawing";
import { KANJIVG_VIEWBOX } from "../kanjivg";
import type { GlyphModel } from "../strokeData";

/** Camadas decorativas (o que importa já está no texto e nos anúncios): `aria-hidden` e sem receber toque. */
function Layer({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${KANJIVG_VIEWBOX} ${KANJIVG_VIEWBOX}`} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
      {children}
    </svg>
  );
}

const STROKE_PROPS = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Papel quadriculado de caligrafia (cruz tracejada no meio), como nos cadernos japoneses. */
export function PracticeGrid() {
  const middle = KANJIVG_VIEWBOX / 2;
  return (
    <Layer>
      <g className="stroke-journey-wood/20" strokeWidth={0.6} strokeDasharray="2.5 2.5">
        <line x1={middle} y1={0} x2={middle} y2={KANJIVG_VIEWBOX} />
        <line x1={0} y1={middle} x2={KANJIVG_VIEWBOX} y2={middle} />
      </g>
    </Layer>
  );
}

function Numbers({ glyph, only }: { glyph: GlyphModel; only?: number }) {
  return (
    <g className="fill-journey-orange font-ui" fontSize={8} fontWeight={900}>
      {glyph.numbers.map(([x, y], index) =>
        only === undefined || only === index ? (
          <text key={index} x={x} y={y}>
            {index + 1}
          </text>
        ) : null
      )}
    </g>
  );
}

/**
 * Guia fantasma do Traçar: o kana todo bem claro e o próximo traço em laranja, com um ponto
 * onde ele começa (é o que mostra a direção). Com movimento reduzido, os números ficam sempre à mostra.
 */
export function GlyphGuide({ glyph, next, numbered }: { glyph: GlyphModel; next: number | null; numbered: boolean }) {
  const start = next != null ? glyph.strokes[next]?.points[0] : undefined;
  return (
    <Layer>
      {glyph.strokes.map((stroke, index) => (
        <path
          key={index}
          d={stroke.d}
          {...STROKE_PROPS}
          strokeWidth={index === next ? 5 : 4}
          className={index === next ? "stroke-journey-orange/60" : "stroke-journey-wood/20"}
        />
      ))}
      {start && <circle cx={start.x} cy={start.y} r={3.4} className="fill-journey-orange" />}
      {numbered ? <Numbers glyph={glyph} /> : next != null && <Numbers glyph={glyph} only={next} />}
    </Layer>
  );
}

/** Modelo revelado por cima do desenho (De memória, depois de conferir). */
export function GlyphReveal({ glyph }: { glyph: GlyphModel }) {
  return (
    <Layer>
      {glyph.strokes.map((stroke, index) => (
        <path key={index} d={stroke.d} {...STROKE_PROPS} strokeWidth={3} className="stroke-journey-orange/80" />
      ))}
      <Numbers glyph={glyph} />
    </Layer>
  );
}

/** Traços numerados, parados: é o que aparece no lugar da animação com movimento reduzido. */
export function GlyphNumbered({ glyph }: { glyph: GlyphModel }) {
  return (
    <Layer>
      {glyph.strokes.map((stroke, index) => (
        <path key={index} d={stroke.d} {...STROKE_PROPS} strokeWidth={4.5} className="stroke-journey-ink" />
      ))}
      <Numbers glyph={glyph} />
    </Layer>
  );
}

/** Ordem dos traços animada, um depois do outro, com o número aparecendo quando o traço começa. Remonte com `key` para repetir. */
export function GlyphAnimation({ glyph }: { glyph: GlyphModel }) {
  const timeline = useMemo(() => strokeTimeline(glyph.strokes.map((stroke) => stroke.length)), [glyph]);
  return (
    <Layer>
      {glyph.strokes.map((stroke, index) => (
        <motion.path
          key={index}
          d={stroke.d}
          {...STROKE_PROPS}
          strokeWidth={4.5}
          className="stroke-journey-ink"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { delay: timeline[index].delayMs / 1000, duration: timeline[index].durationMs / 1000, ease: "easeInOut" },
            opacity: { delay: timeline[index].delayMs / 1000, duration: 0.01 },
          }}
        />
      ))}
      <g className="fill-journey-orange font-ui" fontSize={8} fontWeight={900}>
        {glyph.numbers.map(([x, y], index) => (
          <motion.text
            key={index}
            x={x}
            y={y}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: timeline[index].delayMs / 1000, duration: 0.15 }}
          >
            {index + 1}
          </motion.text>
        ))}
      </g>
    </Layer>
  );
}
