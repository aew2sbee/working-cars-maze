// Light falls from the top left, as in a picture book. These give the flat, outlined shapes some depth.

/** The colour of every shadow, at the given strength. */
export function shadow(alpha: number): string {
  return `rgba(30, 14, 4, ${alpha})`;
}

/** A #rrggbb colour mixed toward white (amount above 0) or black (below 0); 1 goes all the way. */
export function tint(color: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const mix = Math.abs(amount);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(color.slice(i, i + 2), 16);
    return Math.round(channel + (target - channel) * mix);
  });
  return `rgb(${r}, ${g}, ${b})`;
}

/** Lit at `top` and shaded at `bottom`, like a rounded surface under light from above. */
export function litGradient(
  ctx: CanvasRenderingContext2D,
  color: string,
  top: number,
  bottom: number,
  strength = 0.3,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, tint(color, strength));
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, tint(color, -strength));
  return gradient;
}

/** For a ball or dome centred on (x, y): brightest above and to the left of the middle. */
export function ballGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  strength = 0.35,
): CanvasGradient {
  const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
  gradient.addColorStop(0, tint(color, strength));
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, tint(color, -strength * 0.6));
  return gradient;
}

/** Fills a ball shaded by `ballGradient`, leaving its circle as the current path so it can be outlined. */
export function fillBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  strength?: number,
): void {
  ctx.fillStyle = ballGradient(ctx, x, y, r, color, strength);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Strokes the current path as a white gleam, like light caught on shiny paint. */
export function strokeGleam(ctx: CanvasRenderingContext2D, width: number, alpha = 0.6): void {
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Strokes `path` again as a thin, lighter streak moved by (dx, dy) toward the light, so a thick line looks round. */
export function strokeStreak(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  color: string,
  width: number,
  dx: number,
  dy: number,
): void {
  ctx.save();
  ctx.translate(dx, dy);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(path);
  ctx.restore();
}

/** A soft shadow on the ground, centred on (x, y). */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  gradient.addColorStop(0, shadow(0.4));
  gradient.addColorStop(0.6, shadow(0.25));
  gradient.addColorStop(1, shadow(0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
