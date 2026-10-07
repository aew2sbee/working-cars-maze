// Canvas drawing: a picture-book cutaway of the ground, the tunnels and the treasure.

import { E, isOpen, S, type Cell, type Maze } from './maze';
import { mulberry32 } from './random';

export interface Layout {
  width: number;
  height: number;
  /** Where the grass meets the soil. */
  groundY: number;
  cell: number;
  originX: number;
  originY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  size: number;
  color: string;
}

/** Tunnel width as a share of the cell; the rest is soil wall. */
export const TUNNEL = 0.62;

export const INK = '#3a2213';
const STRATA = ['#8a5a36', '#7a4d2d', '#6a4126', '#5b361f'];
const TUNNEL_FLOOR = '#dcb283';
const PEBBLES = ['#a4835f', '#4b2a17', '#b39272', '#5e3a22'];
export const HAT = '#ffd23f';

export function cellCenter(layout: Layout, cell: { col: number; row: number }): { x: number; y: number } {
  return {
    x: layout.originX + (cell.col + 0.5) * layout.cell,
    y: layout.originY + (cell.row + 0.5) * layout.cell,
  };
}

/** Everything that stays still while playing; drawn once per maze or resize. */
export function drawBackground(ctx: CanvasRenderingContext2D, layout: Layout, maze: Maze, seed: number): void {
  const random = mulberry32(seed);
  const { width, height, groundY, cell } = layout;

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#6fc3ea');
  sky.addColorStop(1, '#c4ebf7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);

  // Soil layers with wavy borders, like a cross-section in a picture book.
  const band = (height - groundY) / STRATA.length;
  STRATA.forEach((color, i) => {
    const top = groundY + i * band;
    const amplitude = i === 0 ? 0 : band * 0.1;
    const phase = random() * Math.PI * 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 16; x += 16) {
      ctx.lineTo(x, top + Math.sin(x / 80 + phase) * amplitude);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });

  const pebbleCount = Math.round((width * (height - groundY)) / 2600);
  for (let i = 0; i < pebbleCount; i++) {
    const r = 2 + random() * 7;
    ctx.fillStyle = PEBBLES[Math.floor(random() * PEBBLES.length)];
    ctx.beginPath();
    ctx.ellipse(random() * width, groundY + 10 + random() * (height - groundY), r * 1.3, r, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Roots hanging from the grass.
  ctx.strokeStyle = '#4b2a17';
  ctx.lineCap = 'round';
  for (let i = 0; i < Math.round(width / 120); i++) {
    const x = random() * width;
    const length = 20 + random() * 45;
    ctx.lineWidth = 2 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.bezierCurveTo(x - 10, groundY + length * 0.4, x + 12, groundY + length * 0.7, x + random() * 10 - 5, groundY + length);
    ctx.stroke();
  }

  // Grass strip with tufts.
  ctx.fillStyle = '#5aa83a';
  ctx.fillRect(0, groundY - 10, width, 14);
  ctx.fillStyle = '#6cc04a';
  for (let x = 0; x < width; x += 12) {
    const tall = 8 + random() * 10;
    ctx.beginPath();
    ctx.moveTo(x, groundY - 8);
    ctx.lineTo(x + 6, groundY - 8 - tall);
    ctx.lineTo(x + 12, groundY - 8);
    ctx.fill();
  }

  // Earthworms living inside walls, where they never block a tunnel.
  const walls: { x: number; y: number }[] = [];
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      const center = cellCenter(layout, { col, row });
      if (col < maze.cols - 1 && !isOpen(maze, { col, row }, E)) walls.push({ x: center.x + cell / 2, y: center.y });
    }
  }
  for (let i = 0; i < Math.min(2, walls.length); i++) {
    const [spot] = walls.splice(Math.floor(random() * walls.length), 1);
    drawWorm(ctx, spot.x, spot.y, cell * 0.32);
  }

  drawTunnels(ctx, layout, maze);
}

function drawTunnels(ctx: CanvasRenderingContext2D, layout: Layout, maze: Maze): void {
  const tunnels = new Path2D();
  const start = cellCenter(layout, { col: 0, row: 0 });
  // The way in, dug down from the grass.
  tunnels.moveTo(start.x, layout.groundY - 14);
  tunnels.lineTo(start.x, start.y);

  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      const from = cellCenter(layout, { col, row });
      tunnels.moveTo(from.x, from.y);
      tunnels.lineTo(from.x, from.y);
      if (isOpen(maze, { col, row }, E)) {
        tunnels.moveTo(from.x, from.y);
        tunnels.lineTo(from.x + layout.cell, from.y);
      }
      if (isOpen(maze, { col, row }, S)) {
        tunnels.moveTo(from.x, from.y);
        tunnels.lineTo(from.x, from.y + layout.cell);
      }
    }
  }

  ctx.save();
  // Cut the entrance off at the grass so it reads as a hole in the ground.
  ctx.beginPath();
  ctx.rect(0, layout.groundY - 6, layout.width, layout.height);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3d2314';
  ctx.lineWidth = layout.cell * (TUNNEL + 0.08);
  ctx.stroke(tunnels);
  ctx.strokeStyle = TUNNEL_FLOOR;
  ctx.lineWidth = layout.cell * TUNNEL;
  ctx.stroke(tunnels);
  ctx.restore();
}

function drawWorm(ctx: CanvasRenderingContext2D, x: number, y: number, length: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#e98aa0';
  ctx.lineWidth = length * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, -length / 2);
  ctx.bezierCurveTo(length * 0.3, -length / 6, -length * 0.3, length / 6, 0, length / 2);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(length * 0.02, -length * 0.42, length * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Tread marks along the tunnels already driven through. */
export function drawTreadMarks(ctx: CanvasRenderingContext2D, layout: Layout, segments: [Cell, Cell][]): void {
  if (segments.length === 0) return;
  const path = new Path2D();
  for (const [from, to] of segments) {
    const a = cellCenter(layout, from);
    const b = cellCenter(layout, to);
    path.moveTo(a.x, a.y);
    path.lineTo(b.x, b.y);
  }
  ctx.save();
  ctx.strokeStyle = '#b8895a';
  ctx.lineWidth = layout.cell * 0.3;
  ctx.lineCap = 'butt';
  ctx.setLineDash([layout.cell * 0.06, layout.cell * 0.07]);
  ctx.stroke(path);
  ctx.restore();
}

export function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, open: boolean): void {
  const u = size / 100;
  ctx.save();
  ctx.translate(x, y);

  // Twinkles so the goal is easy to spot.
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + time * 0.6;
    const scale = 0.55 + 0.45 * Math.sin(time * 3 + i * 2);
    drawStar(ctx, Math.cos(angle) * 58 * u, Math.sin(angle) * 46 * u - 10 * u, 12 * u * scale, '#fff4b0');
  }

  ctx.scale(u, u);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;

  if (open) {
    ctx.fillStyle = 'rgba(255, 236, 140, 0.55)';
    ctx.beginPath();
    ctx.arc(0, -8, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#b0612a';
  ctx.beginPath();
  ctx.roundRect(-34, -6, 68, 38, 5);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  if (open) {
    ctx.translate(0, -6);
    ctx.rotate(-0.5);
    ctx.translate(0, -18);
  } else {
    ctx.translate(0, -6);
  }
  ctx.fillStyle = '#c4733a';
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(-34, -12);
  ctx.quadraticCurveTo(0, -34, 34, -12);
  ctx.lineTo(34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (open) {
    for (const [gx, color] of [[-16, '#5ad1ff'], [0, '#ff6fa8'], [16, '#7be36a']] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(gx, -20);
      ctx.lineTo(gx + 8, -10);
      ctx.lineTo(gx, 0);
      ctx.lineTo(gx - 8, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.fillStyle = HAT;
  for (const bx of [-22, 16]) {
    ctx.fillRect(bx, -6, 6, 38);
    ctx.strokeRect(bx, -6, 6, 38);
  }
  ctx.beginPath();
  ctx.roundRect(-7, 2, 14, 14, 3);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

/** A soft pulsing ring that says "touch here". */
export function drawHint(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number): void {
  const pulse = (time * 1.4) % 1;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 247, 214, ${0.9 * (1 - pulse)})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, radius * (0.8 + pulse * 0.5), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    drawStar(ctx, 0, 0, p.size, p.color);
    ctx.restore();
  }
}
