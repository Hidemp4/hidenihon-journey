import { useEffect, useState, useRef } from "react";
import { kanaStrokeData } from "@/data/kanaStrokeData";

interface StrokeOrderAnimationProps {
  char: string;
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

const kanjiStrokeCache: Record<string, string[]> = {};
const fallbackPaths = ["M 30,50 Q 50,30 70,50", "M 50,25 L 50,75"];
const strokeColors = ["#C0392B", "#2980B9", "#27AE60", "#8E44AD", "#E67E22", "#16A085", "#D35400"];

function medianToPath(pts: number[][]): string {
  if (pts.length < 2) return "";
  const s = (v: number) => parseFloat(((v / 1000) * 88 + 6).toFixed(1));
  let d = `M ${s(pts[0][0])},${s(pts[0][1])}`;
  if (pts.length === 2) return `${d} L ${s(pts[1][0])},${s(pts[1][1])}`;
  for (let i = 1; i < pts.length; i++) {
    if (i === pts.length - 1) {
      d += ` ${s(pts[i][0])},${s(pts[i][1])}`;
    } else {
      const x = s(pts[i][0]);
      const y = s(pts[i][1]);
      d += ` Q ${x},${y} ${((x + s(pts[i + 1][0])) / 2).toFixed(1)},${((y + s(pts[i + 1][1])) / 2).toFixed(1)}`;
    }
  }
  return d;
}

async function loadKanjiStrokes(char: string): Promise<string[]> {
  if (kanjiStrokeCache[char]) return kanjiStrokeCache[char];
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${char}.json`);
    if (!res.ok) throw new Error("not found");
    const data = await res.json() as { medians: Array<{ id: string; value: number[][] }> };

    const groups: Record<string, number[][]> = {};
    const order: string[] = [];
    for (const { id, value } of data.medians) {
      const base = id.replace(/[a-z]$/, "");
      if (!groups[base]) order.push(base);
      groups[base] ??= value;
    }

    const paths = order.map((id) => medianToPath(groups[id])).filter(Boolean);

    kanjiStrokeCache[char] = paths;
    return paths;
  } catch {
    return [];
  }
}

function getDotStart(d: string) {
  const match = d.match(/M\s*([\d.]+),([\d.]+)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

export default function StrokeOrderAnimation({
  char,
  size = 120,
  autoPlay = true,
  loop = true,
}: StrokeOrderAnimationProps) {
  const [paths, setPaths] = useState<string[]>(() => kanaStrokeData[char] ?? []);
  const [visibleStrokes, setVisibleStrokes] = useState(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const local = kanaStrokeData[char];
    if (local) {
      setPaths(local);
      return;
    }
    let cancelled = false;
    setPaths([]);
    loadKanjiStrokes(char).then((next) => {
      if (!cancelled) setPaths(next.length ? next : fallbackPaths);
    });
    return () => {
      cancelled = true;
    };
  }, [char]);

  useEffect(() => {
    if (!autoPlay || paths.length === 0) return;
    setVisibleStrokes(0);
    if (animRef.current) clearInterval(animRef.current);
    if (loopRef.current) clearTimeout(loopRef.current);

    const startAnimation = () => {
      let stroke = 0;
      animRef.current = setInterval(() => {
        stroke++;
        setVisibleStrokes(stroke);
        if (stroke >= paths.length) {
          if (animRef.current) clearInterval(animRef.current);
          if (loop) {
            loopRef.current = setTimeout(() => {
              setVisibleStrokes(0);
              setTimeout(startAnimation, 300);
            }, 2000);
          }
        }
      }, 700);
    };

    const initTimer = setTimeout(startAnimation, 500);
    return () => {
      clearTimeout(initTimer);
      if (animRef.current) clearInterval(animRef.current);
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [autoPlay, loop, paths]);

  const activeIndex = visibleStrokes - 1;
  const drawingPath = activeIndex >= 0 && activeIndex < paths.length ? paths[activeIndex] : "";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="rounded-xl"
        style={{ background: "hsl(40 30% 97%)", border: "2px solid hsl(40 20% 88%)" }}
      >
        <line x1="50" y1="0" x2="50" y2="100" stroke="hsl(40 20% 80%)" strokeWidth="0.5" strokeDasharray="3,3" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="hsl(40 20% 80%)" strokeWidth="0.5" strokeDasharray="3,3" />

        <text
          x="50"
          y="72"
          textAnchor="middle"
          fontSize="58"
          fontFamily="'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif"
          fill="hsl(40 20% 88%)"
          style={{ userSelect: "none" }}
        >
          {char}
        </text>

        {paths.slice(0, Math.max(0, visibleStrokes - 1)).map((d, i) => (
          <path
            key={`done-${i}`}
            d={d}
            stroke={strokeColors[i % strokeColors.length]}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.85"
          />
        ))}

        {drawingPath && (
          <path
            key={`drawing-${activeIndex}-${visibleStrokes}`}
            d={drawingPath}
            stroke={strokeColors[activeIndex % strokeColors.length]}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ strokeDasharray: 400, strokeDashoffset: 400, animation: "draw-stroke 0.65s ease-out forwards" }}
          />
        )}

        {paths.slice(0, visibleStrokes).map((d, i) => {
          const dot = getDotStart(d);
          if (!dot) return null;
          return (
            <circle
              key={`dot-${i}`}
              cx={dot.x}
              cy={dot.y}
              r="3.5"
              fill={strokeColors[i % strokeColors.length]}
              opacity="0.9"
            />
          );
        })}
      </svg>

      <div className="flex gap-1">
        {paths.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: 8,
              height: 8,
              background: i < visibleStrokes ? strokeColors[i % strokeColors.length] : "hsl(40 20% 82%)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
