import { useEffect, useRef } from "react";
import { ArenaEngine } from "./arena/engine";

/** Largura (px) que cada "pixel" de cena ocupa: calculada para os pixels ficarem sempre quadrados. */
const MIN_SCALE = 2;
const MAX_SCALE = 4;
const WIDTH_PER_SCALE_STEP = 260;

function createCanvasElement(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

interface NinjaArenaProps {
  /** Com movimento reduzido a cena é desenhada parada. */
  reducedMotion: boolean;
  className?: string;
}

/**
 * Cena 2D em pixel art desenhada num <canvas> de baixa resolução e ampliada com
 * `image-rendering: pixelated`. Os ninjas se movem sozinhos de forma aleatória.
 */
export function NinjaArena({ reducedMotion, className = "" }: NinjaArenaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!container || !canvas || !context) return;

    const engine = new ArenaEngine({ createCanvas: createCanvasElement });
    let frameId = 0;
    let lastTime = 0;
    let visible = true;
    let sized = false;

    const draw = () => engine.render(context);

    const loop = (now: number) => {
      engine.update(lastTime ? (now - lastTime) / 1000 : 0);
      lastTime = now;
      draw();
      frameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reducedMotion || frameId || !visible || !sized) return;
      lastTime = 0;
      frameId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const fit = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) return;

      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(width / WIDTH_PER_SCALE_STEP)));
      const sceneWidth = Math.ceil(width / scale);
      const sceneHeight = Math.ceil(height / scale);

      canvas.width = sceneWidth; // redimensionar limpa o canvas, por isso desenhamos logo em seguida
      canvas.height = sceneHeight;
      canvas.style.width = `${sceneWidth * scale}px`;
      canvas.style.height = `${sceneHeight * scale}px`;
      context.imageSmoothingEnabled = false;

      engine.resize(sceneWidth, sceneHeight);
      sized = true;
      draw();
      start();
    };

    fit();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    resizeObserver?.observe(container);
    if (!resizeObserver) window.addEventListener("resize", fit);

    // Pausa quando o cabeçalho sai da tela, para não gastar bateria à toa.
    const intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) start();
            else stop();
          })
        : null;
    intersectionObserver?.observe(container);

    return () => {
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [reducedMotion]);

  return (
    <div ref={containerRef} aria-hidden="true" className={`pointer-events-none overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="absolute bottom-0 left-0 block" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}
