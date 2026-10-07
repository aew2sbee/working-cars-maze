// One maze: drag a finger and the digger follows it along the tunnels to the treasure.

import { playFanfare, playStep, unlockAudio } from './audio';
import {
  cellCenter,
  drawBackground,
  drawChest,
  drawDigger,
  drawHint,
  drawParticles,
  drawTracks,
  type Layout,
  type Particle,
} from './draw';
import { findPath, generateMaze, pickGoal, sameCell, type Cell, type Maze } from './maze';

/** Driving speed in cells per second. */
const SPEED = 4;
/** How many cells ahead of the digger a finger may be and still steer it. */
const MAX_REACH = 3;
/** Comfortable cell size for a small finger, in CSS pixels. */
const TARGET_CELL = 140;
const OVERLAY_DELAY_MS = 900;
const CONFETTI = ['#ffd23f', '#ff6fa8', '#5ad1ff', '#7be36a', '#ffffff'];

interface Elements {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  againButton: HTMLButtonElement;
  safeArea: HTMLElement;
}

export function startGame({ canvas, overlay, againButton, safeArea }: Elements): void {
  const ctx = canvas.getContext('2d')!;
  const background = document.createElement('canvas');
  const backgroundCtx = background.getContext('2d')!;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let maze: Maze;
  let seed = 0;
  let layout: Layout;
  let goal: Cell;
  let current: Cell;
  let position = { col: 0, row: 0 };
  let route: Cell[] = [];
  let facing: 1 | -1 = 1;
  let tracks: [Cell, Cell][] = [];
  let moving = false;
  let hasMoved = false;
  let cleared = false;
  let hintUntil = 0;
  let particles: Particle[] = [];
  let activePointer: number | null = null;
  let overlayTimer = 0;

  function insets(): { top: number; right: number; bottom: number; left: number } {
    const style = getComputedStyle(safeArea);
    return {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    };
  }

  /** The area the maze may use, below the grass and inside the safe area. */
  function playArea(width: number, height: number) {
    const inset = insets();
    const groundY = inset.top + Math.min(88, Math.max(48, height * 0.1));
    const pad = 16;
    return {
      groundY,
      left: inset.left + pad,
      top: groundY + pad,
      width: width - inset.left - inset.right - pad * 2,
      height: height - groundY - inset.bottom - pad * 2,
    };
  }

  function newMaze(): void {
    const area = playArea(canvas.clientWidth, canvas.clientHeight);
    const cols = Math.min(7, Math.max(3, Math.round(area.width / TARGET_CELL)));
    const rows = Math.min(6, Math.max(3, Math.round(area.height / TARGET_CELL)));
    seed = Math.floor(Math.random() * 2 ** 32);
    maze = generateMaze(cols, rows);
    current = { col: 0, row: 0 };
    goal = pickGoal(maze, current);
    position = { ...current };
    route = [];
    tracks = [];
    facing = 1;
    hasMoved = false;
    cleared = false;
    particles = [];
    clearTimeout(overlayTimer);
    overlay.hidden = true;
    resize();
  }

  function resize(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    for (const target of [canvas, background]) {
      target.width = Math.round(width * dpr);
      target.height = Math.round(height * dpr);
    }
    const area = playArea(width, height);
    const cell = Math.min(area.width / maze.cols, area.height / maze.rows);
    layout = {
      width,
      height,
      groundY: area.groundY,
      cell,
      originX: area.left + (area.width - cell * maze.cols) / 2,
      originY: area.top + (area.height - cell * maze.rows) / 2,
    };
    backgroundCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(backgroundCtx, layout, maze, seed);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cellAt(event: PointerEvent): Cell | null {
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left - layout.originX) / layout.cell);
    const row = Math.floor((event.clientY - rect.top - layout.originY) / layout.cell);
    if (col < 0 || row < 0 || col >= maze.cols || row >= maze.rows) return null;
    return { col, row };
  }

  /** Plans a route to the touched cell when it is close enough along the tunnels. */
  function steer(event: PointerEvent): boolean {
    const target = cellAt(event);
    if (!target) return false;
    const path = findPath(maze, current, target);
    if (path.length - 1 > MAX_REACH) return false;
    const heading = route[0];
    // Mid-way between cells, turning around means driving back to the last cell first.
    const turnsBack = heading && !(path[1] && sameCell(path[1], heading));
    route = turnsBack ? [current, ...path.slice(1)] : path.slice(1);
    return true;
  }

  function arrive(cell: Cell): void {
    if (!sameCell(cell, current)) {
      if (!tracks.some(([a, b]) => (sameCell(a, cell) && sameCell(b, current)) || (sameCell(a, current) && sameCell(b, cell)))) {
        tracks.push([current, cell]);
      }
      playStep();
      hasMoved = true;
    }
    current = cell;
    route.shift();
    if (sameCell(current, goal)) celebrate();
  }

  function celebrate(): void {
    cleared = true;
    route = [];
    activePointer = null;
    playFanfare();
    if (!reduceMotion.matches) {
      const { x, y } = cellCenter(layout, goal);
      particles = Array.from({ length: 70 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 250 + Math.random() * 450;
        return {
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 300,
          spin: (Math.random() - 0.5) * 10,
          angle: Math.random() * Math.PI,
          size: 6 + Math.random() * 9,
          color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        };
      });
    }
    overlayTimer = window.setTimeout(() => {
      overlay.hidden = false;
      againButton.focus();
    }, OVERLAY_DELAY_MS);
  }

  function update(dt: number): void {
    const next = route[0];
    moving = Boolean(next);
    if (next) {
      const dx = next.col - position.col;
      const dy = next.row - position.row;
      const distance = Math.hypot(dx, dy);
      if (Math.abs(dx) > 1e-6) facing = dx > 0 ? 1 : -1;
      const step = SPEED * dt;
      if (distance <= step) {
        position = { col: next.col, row: next.row };
        arrive(next);
      } else {
        position = { col: position.col + (dx / distance) * step, row: position.row + (dy / distance) * step };
      }
    }
    for (const p of particles) {
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
    particles = particles.filter((p) => p.y < layout.height + 40);
  }

  function render(time: number): void {
    ctx.drawImage(background, 0, 0, layout.width, layout.height);
    drawTracks(ctx, layout, tracks);

    const chest = cellCenter(layout, goal);
    if (!cleared) drawChest(ctx, chest.x, chest.y, layout.cell * 0.6, time, false);

    const digger = cellCenter(layout, position);
    const size = layout.cell * 0.78;
    const wiggle = time < hintUntil ? Math.sin(time * 30) * size * 0.04 : 0;
    const bob = moving ? Math.sin(time * 22) * size * 0.02 : 0;
    if (!cleared && (!hasMoved || time < hintUntil)) drawHint(ctx, digger.x, digger.y, size * 0.6, time);
    drawDigger(ctx, digger.x + wiggle, digger.y, size, facing, bob);

    // Once found, the open chest pops up above the digger instead of hiding under it.
    if (cleared) drawChest(ctx, chest.x, chest.y - layout.cell * 0.45, layout.cell * 0.6, time, true);

    drawParticles(ctx, particles);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (cleared) return;
    unlockAudio();
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    // A touch too far away gets a wiggle so the child knows where to start.
    if (!steer(event)) hintUntil = performance.now() / 1000 + 0.8;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointer && !cleared) steer(event);
  });
  const release = (event: PointerEvent): void => {
    if (event.pointerId === activePointer) activePointer = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  againButton.addEventListener('click', () => {
    unlockAudio();
    newMaze();
  });
  window.addEventListener('resize', resize);

  if (import.meta.env.DEV) {
    // Lets automated checks drive a finger along the solution; not in production builds.
    Object.assign(window, {
      __maze: { solution: () => findPath(maze, current, goal).map((cell) => cellCenter(layout, cell)) },
    });
  }

  newMaze();
  let last = performance.now();
  const frame = (now: number): void => {
    update(Math.min((now - last) / 1000, 0.05));
    last = now;
    render(now / 1000);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
