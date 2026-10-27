// Canvas drawing: a picture-book cutaway of the ground, the tunnels and the treasure.

import { E, isOpen, S, type Cell, type Maze } from './maze';
import { mulberry32 } from './random';
import { drawShadow, litGradient, shadow, strokeGleam, strokeStreak, tint } from './shade';

export interface Layout {
  width: number;
  height: number;
  /** Where the grass meets the soil. */
  groundY: number;
  /** Top of the sky inside the safe area, and the left edge of the play area. */
  skyTop: number;
  left: number;
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
const HOLLOW_EDGE = '#3d2314';
/** Which way the shadows inside a hollow fall, per unit of depth: mostly down, a little to the right. */
const LIGHT = { x: 0.6, y: 1 };
const PEBBLES = ['#a4835f', '#4b2a17', '#b39272', '#5e3a22'];
const GRASS: Grass = { strip: '#5aa83a', back: '#4a9230', front: '#6cc04a' };
const ROOT = '#4b2a17';
const WORM = '#e98aa0';
const WOOD = '#b0612a';
export const HAT = '#ffd23f';

/** The strip of grass along the top of the ground, with tufts of two shades. */
export interface Grass {
  strip: string;
  back: string;
  front: string;
}

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

  drawStrata(ctx, width, groundY, height, STRATA, random);

  // Pebbles sitting in a little shade of their own, each catching the light on top.
  const pebbleCount = Math.round((width * (height - groundY)) / 2600);
  for (let i = 0; i < pebbleCount; i++) {
    const r = 2 + random() * 7;
    const color = PEBBLES[Math.floor(random() * PEBBLES.length)];
    const x = random() * width;
    const y = groundY + 10 + random() * (height - groundY);
    const angle = random() * Math.PI;
    for (const [dx, dy, size, fill] of [
      [r * 0.25, r * 0.35, r, shadow(0.3)],
      [0, 0, r, color],
      [-r * 0.3, -r * 0.3, r * 0.35, tint(color, 0.3)],
    ] as const) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, size * 1.3, size, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Roots hanging from the grass, rounded by a lighter streak down one side.
  ctx.lineCap = 'round';
  ctx.strokeStyle = ROOT;
  for (let i = 0; i < Math.round(width / 120); i++) {
    const x = random() * width;
    const length = 20 + random() * 45;
    const thickness = 2 + random() * 2;
    const root = new Path2D();
    root.moveTo(x, groundY);
    root.bezierCurveTo(x - 10, groundY + length * 0.4, x + 12, groundY + length * 0.7, x + random() * 10 - 5, groundY + length);
    ctx.lineWidth = thickness;
    ctx.stroke(root);
    strokeStreak(ctx, root, tint(ROOT, 0.25), thickness * 0.35, -thickness * 0.2, 0);
  }

  drawGrass(ctx, width, groundY, GRASS, random);

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

  const opening = groundY - 6;
  const depth = cell * 0.12;
  ctx.save();
  // Cut the entrance off at the grass so it reads as a hole in the ground.
  ctx.beginPath();
  ctx.rect(0, opening, width, height);
  ctx.clip();
  // The entrance starts above the opening by the depth of the ceiling's shadow, so the cut leaves none of it.
  drawHollow(ctx, tunnelShape(layout, maze, opening - depth), TUNNEL_FLOOR, cell * 0.04, depth);
  ctx.restore();
}

/** Soil in layers with wavy borders, like a cross-section in a picture book, each lit along its top. */
export function drawStrata(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  bottom: number,
  colors: readonly string[],
  random: () => number,
): void {
  const band = (bottom - top) / colors.length;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.22)';
  ctx.lineWidth = 3;
  colors.forEach((color, i) => {
    const y = top + i * band;
    const amplitude = i === 0 ? 0 : band * 0.1;
    const phase = random() * Math.PI * 2;
    const border = new Path2D();
    for (let x = 0; x <= width + 16; x += 16) {
      border.lineTo(x, y + Math.sin(x / 80 + phase) * amplitude);
    }
    const layer = new Path2D(border);
    layer.lineTo(width, bottom);
    layer.lineTo(0, bottom);
    layer.closePath();
    ctx.fillStyle = litGradient(ctx, color, y, y + band, 0.12);
    ctx.fill(layer);
    ctx.stroke(border);
  });
  ctx.restore();
}

/** The grass along the top of the ground: a back row of tufts in shade, a front row in the light. */
export function drawGrass(ctx: CanvasRenderingContext2D, width: number, groundY: number, grass: Grass, random: () => number): void {
  const top = groundY - 10;
  const bottom = groundY + 4;
  // Its shadow on the soil just under it.
  const shade = ctx.createLinearGradient(0, bottom, 0, bottom + 12);
  shade.addColorStop(0, shadow(0.35));
  shade.addColorStop(1, shadow(0));
  ctx.fillStyle = shade;
  ctx.fillRect(0, bottom, width, 12);
  ctx.fillStyle = litGradient(ctx, grass.strip, top, bottom, 0.2);
  ctx.fillRect(0, top, width, bottom - top);
  for (const [shift, color] of [
    [-6, grass.back],
    [0, grass.front],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let x = shift; x < width; x += 12) {
      const tall = 8 + random() * 10;
      ctx.moveTo(x, groundY - 8);
      ctx.lineTo(x + 6, groundY - 8 - tall);
      ctx.lineTo(x + 12, groundY - 8);
    }
    ctx.fill();
  }
}

/**
 * A hollow dug into the ground, shaped like `shape` filled with the nonzero rule. It gets an outline
 * `ring` wide and soil sloping down into it; inside, the ceiling is in shadow `depth` deep and the floor catches the light.
 */
export function drawHollow(ctx: CanvasRenderingContext2D, shape: Path2D, floor: string, ring: number, depth: number): void {
  const along = (distance: number): void => ctx.translate(LIGHT.x * distance, LIGHT.y * distance);
  const fillAlong = (distance: number, color: string): void => {
    ctx.save();
    along(distance);
    ctx.fillStyle = color;
    ctx.fill(shape);
    ctx.restore();
  };
  const strokeAlong = (distance: number, color: string): void => {
    ctx.save();
    along(distance);
    ctx.strokeStyle = color;
    ctx.stroke(shape);
    ctx.restore();
  };
  ctx.save();
  ctx.lineJoin = 'round';

  // The slope is away from the light above the hollow and toward it below.
  const slope = ring * 0.6;
  ctx.lineWidth = (ring + slope) * 2;
  strokeAlong(-slope, shadow(0.35));
  strokeAlong(slope, 'rgba(255, 236, 200, 0.3)');
  ctx.lineWidth = ring * 2;
  ctx.strokeStyle = HOLLOW_EDGE;
  ctx.stroke(shape);

  // Each copy of the shape, moved further from the light, covers all but a band along the top edges:
  // the deepest shadow first, then a lighter one, then the lit colour.
  ctx.clip(shape);
  fillAlong(0, tint(floor, -0.3));
  fillAlong(depth * 0.45, tint(floor, -0.15));
  fillAlong(depth, tint(floor, 0.2));
  // The plain floor colour goes over the middle, leaving the lit colour in a strip along the bottom edges,
  // which face the light.
  const lit = depth * 0.4;
  along(-lit);
  ctx.clip(shape);
  along(lit);
  fillAlong(depth, floor);
  ctx.restore();
}

/** The tunnels as one shape to fill: a round chamber in every cell, joined where the maze is open. */
function tunnelShape(layout: Layout, maze: Maze, entranceTop: number): Path2D {
  const r = (layout.cell * TUNNEL) / 2;
  const shape = new Path2D();
  const start = cellCenter(layout, { col: 0, row: 0 });
  // The way in, dug down from the grass.
  shape.rect(start.x - r, entranceTop, r * 2, start.y - entranceTop);
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      const { x, y } = cellCenter(layout, { col, row });
      shape.moveTo(x + r, y);
      shape.arc(x, y, r, 0, Math.PI * 2);
      shape.closePath();
      if (isOpen(maze, { col, row }, E)) shape.rect(x, y - r, layout.cell, r * 2);
      if (isOpen(maze, { col, row }, S)) shape.rect(x - r, y, r * 2, layout.cell);
    }
  }
  return shape;
}

function drawWorm(ctx: CanvasRenderingContext2D, x: number, y: number, length: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  const body = new Path2D();
  body.moveTo(0, -length / 2);
  body.bezierCurveTo(length * 0.3, -length / 6, -length * 0.3, length / 6, 0, length / 2);
  ctx.strokeStyle = WORM;
  ctx.lineWidth = length * 0.22;
  ctx.stroke(body);
  strokeStreak(ctx, body, tint(WORM, 0.45), length * 0.07, -length * 0.04, -length * 0.02);
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

/** Stars circling a chest of the given size, so a treasure is easy to spot. */
export function drawTwinkles(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number): void {
  const u = size / 100;
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + time * 0.6;
    const scale = 0.55 + 0.45 * Math.sin(time * 3 + i * 2);
    drawStar(ctx, x + Math.cos(angle) * 58 * u, y + Math.sin(angle) * 46 * u - 10 * u, 12 * u * scale, '#fff4b0');
  }
}

/** With `grounded`, it sits on the tunnel floor and casts a shadow; otherwise it floats. */
export function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, open: boolean, grounded = false): void {
  const u = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  if (grounded) drawShadow(ctx, 0, 33, 42, 6);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;

  if (open) {
    // Light pouring out of the open chest.
    const glow = ctx.createRadialGradient(0, -8, 0, 0, -8, 46);
    glow.addColorStop(0, 'rgba(255, 240, 160, 0.9)');
    glow.addColorStop(1, 'rgba(255, 236, 140, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -8, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = litGradient(ctx, WOOD, -6, 32);
  ctx.beginPath();
  ctx.roundRect(-34, -6, 68, 38, 5);
  ctx.fill();
  ctx.stroke();
  // The seam between two planks.
  ctx.save();
  ctx.strokeStyle = tint(WOOD, -0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-31, 13);
  ctx.lineTo(31, 13);
  ctx.stroke();
  ctx.restore();

  if (open) {
    // The dark inside, seen from a little above.
    ctx.save();
    ctx.fillStyle = '#4a2410';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -10, 30, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  if (open) {
    ctx.translate(0, -6);
    ctx.rotate(-0.5);
    ctx.translate(0, -18);
  } else {
    ctx.translate(0, -6);
  }
  ctx.fillStyle = litGradient(ctx, '#c4733a', -24, 0);
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(-34, -12);
  ctx.quadraticCurveTo(0, -34, 34, -12);
  ctx.lineTo(34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-24, -12.5);
  ctx.quadraticCurveTo(-15, -19, -4, -18);
  strokeGleam(ctx, 4, 0.45);
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
      // The facet turned toward the light.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.moveTo(gx - 0.5, -16.5);
      ctx.lineTo(gx - 5, -10.5);
      ctx.lineTo(gx - 0.5, -10.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = litGradient(ctx, HAT, -6, 32);
  for (const bx of [-22, 16]) {
    ctx.fillRect(bx, -6, 6, 38);
    ctx.strokeRect(bx, -6, 6, 38);
  }
  ctx.beginPath();
  ctx.roundRect(-7, 2, 14, 14, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, 5.5);
  ctx.lineTo(1, 5.5);
  strokeGleam(ctx, 2.5);

  ctx.restore();
}

/** The points of a star of radius 1 centred on (0, 0): outer and inner by turns, clockwise from the top. */
const STAR = Array.from({ length: 10 }, (_, i) => {
  const radius = i % 2 === 0 ? 1 : 0.45;
  const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
});
/** That star's faces, split by whether they are turned toward the light; made on first use, as many stars fly at once. */
let starFaces: { lit: Path2D; shaded: Path2D } | undefined;

function makeStarFaces(): { lit: Path2D; shaded: Path2D } {
  const lit = new Path2D();
  const shaded = new Path2D();
  STAR.forEach(([ax, ay], i) => {
    const [bx, by] = STAR[(i + 1) % STAR.length];
    // The outline runs clockwise, so this face looks out along (dy, -dx); the light is toward (-1, -1).
    const face = bx - ax > by - ay ? lit : shaded;
    face.moveTo(0, 0);
    face.lineTo(ax, ay);
    face.lineTo(bx, by);
    face.closePath();
  });
  return { lit, shaded };
}

/**
 * A star raised like a low pyramid: faces turned toward the light at the top left are lighter.
 * The faces are filled as separate paths, so a caller can still stroke the star's outline.
 */
export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [px, py] of STAR) ctx.lineTo(x + px * r, y + py * r);
  ctx.closePath();
  ctx.fill();

  starFaces ??= makeStarFaces();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill(starFaces.lit);
  ctx.fillStyle = shadow(0.2);
  ctx.fill(starFaces.shaded);
  ctx.restore();
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
    // Tumbling over as it flies, so now and then it shows only its edge.
    ctx.scale(Math.cos(p.angle * 1.7), 1);
    drawStar(ctx, 0, 0, p.size, p.color);
    ctx.restore();
  }
}

/** A row of small chests in the grass, one per treasure, opened as each is found. */
export function drawTreasureCount(ctx: CanvasRenderingContext2D, layout: Layout, opened: boolean[]): void {
  const sky = layout.groundY - layout.skyTop;
  const size = Math.min(48, sky * 0.75);
  const y = layout.skyTop + sky / 2 + size * 0.05;
  opened.forEach((open, i) => {
    drawChest(ctx, layout.left + size * (0.6 + i * 1.15), y, size, open);
  });
}
