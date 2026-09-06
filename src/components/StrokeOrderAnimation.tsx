import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getStrokeSteps, kanaStrokeEntriesByChar } from "@/lib/kanaStrokeUtils";

interface StrokeOrderAnimationProps {
  char: string;
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

const strokeColors = ["#C0392B", "#2980B9", "#27AE60", "#8E44AD", "#E67E22", "#16A085", "#D35400"];
const strokeDrawDuration = 700;

export default function StrokeOrderAnimation({
  char,
  size = 160,
  autoPlay = true,
  loop = true,
}: StrokeOrderAnimationProps) {
  const entry = kanaStrokeEntriesByChar.get(char);
  const steps = useMemo(() => (entry ? getStrokeSteps(entry) : []), [entry]);
  const [visibleStrokes, setVisibleStrokes] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeStrokeRevealed, setActiveStrokeRevealed] = useState(false);
  const safeId = useId().replace(/:/g, "");
  const activeIndex = visibleStrokes - 1;
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null;
  const activeMaskId = `kana-active-${safeId}`;

  useEffect(() => {
    setVisibleStrokes(0);
    setActiveStrokeRevealed(false);
  }, [char]);

  useEffect(() => {
    setActiveStrokeRevealed(false);
    if (activeRevealTimeoutRef.current) clearTimeout(activeRevealTimeoutRef.current);
    if (visibleStrokes === 0 || visibleStrokes > steps.length) return;

    activeRevealTimeoutRef.current = setTimeout(() => {
      setActiveStrokeRevealed(true);
    }, strokeDrawDuration);

    return () => {
      if (activeRevealTimeoutRef.current) clearTimeout(activeRevealTimeoutRef.current);
    };
  }, [steps.length, visibleStrokes]);

  useEffect(() => {
    if (!autoPlay || !steps.length) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setVisibleStrokes((current) => {
        if (current < steps.length) return current + 1;
        return loop ? 0 : current;
      });
    }, visibleStrokes === 0 ? 350 : 850);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [autoPlay, loop, steps.length, visibleStrokes]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        className="rounded-xl"
        style={{ background: "hsl(40 30% 97%)", border: "2px solid hsl(40 20% 88%)" }}
        aria-label={`Ordem de escrita de ${char}`}
      >
        <line x1="512" y1="0" x2="512" y2="1024" stroke="hsl(40 20% 80%)" strokeWidth="5" strokeDasharray="30,30" />
        <line x1="0" y1="512" x2="1024" y2="512" stroke="hsl(40 20% 80%)" strokeWidth="5" strokeDasharray="30,30" />

        {!steps.length && (
          <text
            x="512"
            y="710"
            textAnchor="middle"
            fontSize="620"
            fontFamily="'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif"
            fill="hsl(var(--primary))"
            style={{ userSelect: "none" }}
          >
            {char}
          </text>
        )}

        {steps.length > 0 && (
          <>
            <defs>
              <mask id={activeMaskId} maskUnits="userSpaceOnUse">
                <rect x="0" y="0" width="1024" height="1024" fill="black" />
                {activeStep?.medianPath && (
                  <path
                    key={`active-mask-${activeStep.id}-${visibleStrokes}`}
                    d={activeStep.medianPath}
                    stroke="white"
                    strokeWidth="170"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    style={{ strokeDasharray: 2200, strokeDashoffset: 2200, animation: `draw-stroke ${strokeDrawDuration}ms ease-out forwards` }}
                  />
                )}
              </mask>
            </defs>

            {steps.slice(0, Math.max(0, visibleStrokes - 1)).map((step, index) => (
              <path
                key={`done-${step.id}`}
                d={step.fillPath}
                fill={strokeColors[index % strokeColors.length]}
                opacity="0.9"
              />
            ))}

            {activeStep && (
              <path
                key={`active-${activeStep.id}-${visibleStrokes}`}
                d={activeStep.fillPath}
                fill={strokeColors[activeIndex % strokeColors.length]}
                mask={activeStep.medianPath && !activeStrokeRevealed ? `url(#${activeMaskId})` : undefined}
                opacity="0.95"
              />
            )}
          </>
        )}
      </svg>

      {steps.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Traço {Math.min(visibleStrokes, steps.length)} de {steps.length}
        </p>
      )}
    </div>
  );
}
