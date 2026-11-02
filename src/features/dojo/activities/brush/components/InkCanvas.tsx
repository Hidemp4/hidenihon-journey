import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { INK_WIDTH, MIN_POINT_DISTANCE } from "../constants";
import { appendPoint, clientToModel, smoothStrokeCommands } from "../drawing";
import { KANJIVG_VIEWBOX } from "../kanjivg";
import type { Point } from "../strokePath";
import type { DrawnStroke } from "../types";

function paintStroke(context: CanvasRenderingContext2D, points: readonly Point[]) {
  context.beginPath();
  for (const command of smoothStrokeCommands(points)) {
    if (command.type === "dot") {
      context.arc(command.at.x, command.at.y, INK_WIDTH / 2, 0, Math.PI * 2);
      context.fill();
      return;
    }
    if (command.type === "move") context.moveTo(command.to.x, command.to.y);
    else if (command.type === "line") context.lineTo(command.to.x, command.to.y);
    else context.quadraticCurveTo(command.control.x, command.control.y, command.to.x, command.to.y);
  }
  context.stroke();
}

interface InkCanvasProps {
  strokes: readonly DrawnStroke[];
  /** Desligado: o kana já foi conferido (a tinta fica, mas não dá para desenhar mais). */
  enabled: boolean;
  label: string;
  describedBy?: string;
  onStroke: (points: DrawnStroke) => void;
}

/**
 * Tinta com Pointer Events (mouse, toque e caneta). Os pontos ficam em unidades do quadro de 109,
 * então a tinta se redesenha certa em qualquer tamanho/densidade de tela. O traço em andamento
 * vive num ref (um render do React por movimento travaria o desenho); os concluídos vêm por prop.
 */
export function InkCanvas({ strokes, enabled, label, describedBy, onStroke }: InkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef<{ pointerId: number; points: Point[] } | null>(null);
  const frameRef = useRef<number | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    // Desenha em unidades do quadro: a escala já inclui o devicePixelRatio (backing store maior que o CSS).
    context.setTransform(canvas.width / KANJIVG_VIEWBOX, 0, 0, canvas.height / KANJIVG_VIEWBOX, 0, 0);
    const ink = getComputedStyle(canvas).color;
    context.strokeStyle = ink;
    context.fillStyle = ink;
    context.lineWidth = INK_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const stroke of strokes) paintStroke(context, stroke);
    if (activeRef.current) paintStroke(context, activeRef.current.points);
  }, [strokes]);

  // Tamanho do backing store = tamanho na tela × devicePixelRatio (tinta nítida em tela retina).
  // Também roda quando os traços mudam (o `redraw` muda junto): é o que repinta a tinta concluída.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      redraw();
    };

    resize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  // Desligou no meio de um traço (kana conferido por teclado): o traço em andamento é descartado.
  useEffect(() => {
    if (enabled) return;
    activeRef.current = null;
    redraw();
  }, [enabled, redraw]);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const scheduleRedraw = useCallback(() => {
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      redraw();
    });
  }, [redraw]);

  const toPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    return canvas ? clientToModel(clientX, clientY, canvas.getBoundingClientRect(), KANJIVG_VIEWBOX) : null;
  };

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    // Um traço por vez: um segundo dedo (ou a palma) não começa outro no meio.
    if (!enabled || activeRef.current || (event.pointerType === "mouse" && event.button !== 0)) return;
    const point = toPoint(event.clientX, event.clientY);
    if (!point) return;

    event.preventDefault();
    // Captura: o traço continua mesmo se o dedo sair do quadro.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeRef.current = { pointerId: event.pointerId, points: [point] };
    scheduleRedraw();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    // Eventos agrupados pelo navegador entre dois frames: sem eles a curva rápida sai em retas.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const samples = coalesced.length > 0 ? coalesced : [event.nativeEvent];
    let changed = false;
    for (const sample of samples) {
      const point = toPoint(sample.clientX, sample.clientY);
      if (point && appendPoint(active.points, point, MIN_POINT_DISTANCE)) changed = true;
    }
    if (changed) scheduleRedraw();
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const point = toPoint(event.clientX, event.clientY);
    if (point) appendPoint(active.points, point, MIN_POINT_DISTANCE);
    activeRef.current = null;
    onStroke(active.points);
    scheduleRedraw();
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLCanvasElement>) {
    // O sistema tomou o toque (gesto, notificação): o traço pela metade não conta.
    if (activeRef.current?.pointerId !== event.pointerId) return;
    activeRef.current = null;
    scheduleRedraw();
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      // `touch-none`: sem isso o navegador rola a página em vez de desenhar.
      className={`absolute inset-0 h-full w-full touch-none select-none text-journey-ink ${enabled ? "cursor-crosshair" : "cursor-default"}`}
    />
  );
}
