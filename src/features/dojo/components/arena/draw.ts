type Ctx = CanvasRenderingContext2D;

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Círculo "pixelado": preenche linha a linha, sem antialiasing. */
export function fillCircle(ctx: Ctx, cx: number, cy: number, radius: number, color: string) {
  ctx.fillStyle = color;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const half = Math.floor(Math.sqrt(radius * radius - dy * dy) + 0.5);
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/** Linha grossa em pixels inteiros (braços, pernas, relâmpagos). */
export function drawLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, color: string) {
  ctx.fillStyle = color;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const offset = (width - 1) >> 1;
  const steep = Math.abs(dy) > Math.abs(dx);

  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x0 + (dx * i) / steps);
    const y = Math.round(y0 + (dy * i) / steps);
    if (steep) ctx.fillRect(x - offset, y, width, 1);
    else ctx.fillRect(x, y - offset, 1, width);
  }
}
