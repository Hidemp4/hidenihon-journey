import type { RefObject } from "react";
import type { CountdownLevel } from "../useCountdownBar";

// Cores herdadas do HUD do modo Avançado da Arena (a barra é a mesma nas duas atividades).
const LEVEL_COLORS: Record<CountdownLevel, string> = {
  high: "bg-journey-leaf",
  mid: "bg-journey-orange",
  low: "bg-red-600",
};

export function CountdownTrack({ barRef, level, className = "mt-3" }: { barRef: RefObject<HTMLDivElement>; level: CountdownLevel; className?: string }) {
  return (
    <div className={`${className} h-2.5 overflow-hidden rounded-full bg-journey-wood/10`} aria-hidden="true">
      <div ref={barRef} className={`h-full origin-left rounded-full ${LEVEL_COLORS[level]}`} style={{ transform: "scaleX(1)" }} />
    </div>
  );
}
