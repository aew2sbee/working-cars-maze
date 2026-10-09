// Pick a vehicle, then drag a finger and it follows along the tunnels to the treasure.

import { playBump, playFanfare, playStep, unlockAudio } from './audio';
import { drawBedtime } from './bedtime';
import {
  cellCenter,
  drawBackground,
  drawChest,
  drawHint,
  drawParticles,
  drawTreadMarks,
  type Layout,
  type Particle,
} from './draw';
import { isPreview, storagePrefix } from './env';
import { setupLockScreen } from './lock';
import {
  cellAtPoint,
  chooseGrid,
  findPath,
  generateMaze,
  neighbors,
  pickGoal,
  sameCell,
  type Cell,
  type Maze,
} from './maze';
import { limitsFromQuery, loadPlayState, savePlayState, shouldLock, type PlayState } from './playtime';
import { drawVehicle, VEHICLES, type VehicleId } from './vehicles';

/** Driving speed in cells per second. */
const SPEED = 4;
/** How many cells ahead of the vehicle a finger may be and still steer it. */
const MAX_REACH = 3;
/** How far, in cells, a finger must move past the edge of the cell it is on to pick another. */
const SLACK = 0.3;
/** How long a finger must keep pushing into a wall, with the vehicle stopped, before it bumps. */
const BUMP_HOLD_MS = 1000;
/** How long the mole shows it hurt after bumping into a wall. */
const OUCH_SECONDS = 1;
const OVERLAY_DELAY_MS = 900;
const CONFETTI = ['#ffd23f', '#ff6fa8', '#5ad1ff', '#7be36a', '#ffffff'];

interface Elements {
  canvas: HTMLCanvasElement;
  selectScreen: HTMLElement;
  vehicleList: HTMLElement;
  overlay: HTMLElement;
  againButton: HTMLButtonElement;
  changeButton: HTMLButtonElement;
  safeArea: HTMLElement;
  lock: Parameters<typeof setupLockScreen>[0];
}

type Phase = 'select' | 'play' | 'clear' | 'locked';

/** How often play time is counted, and how many counts between saves. */
const TICK_MS = 1000;
const SAVE_EVERY_TICKS = 5;

export function startGame({
  canvas,
  selectScreen,
  vehicleList,
  overlay,
  againButton,
  changeButton,
  safeArea,
  lock: lockElements,
}: Elements): void {
  const ctx = canvas.getContext('2d')!;
  const background = document.createElement('canvas');
  const backgroundCtx = background.getContext('2d')!;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let phase: Phase = 'select';
  let vehicle: VehicleId = 'excavator';
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
  let hintUntil = 0;
  let particles: Particle[] = [];
  /** The finger driving the vehicle; other touches (a palm, a second finger) are ignored. */
  let activePointer: number | null = null;
  /** Until the driving finger first steers, another finger near the vehicle may take over. */
  let activeHasSteered = false;
  /** Fingers on the maze that are not driving, in case one should take over. */
  const otherPointers = new Set<number>();
  /** The cell the driving finger is on, kept while the finger stays near it. */
  let fingerCell: Cell | null = null;
  /** Whether the driving finger is pushing into a wall; it bumps at most once per push. */
  let pushingWall = false;
  /** Since when the vehicle has stood still while the finger pushes into a wall. */
  let stuckSince: number | null = null;
  let bumped = false;
  /** When, in seconds on the animation clock, the mole last bumped into a wall. */
  let ouchAt = -Infinity;
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
    const { cols, rows } = chooseGrid(area.width, area.height);
    seed = Math.floor(Math.random() * 2 ** 32);
    maze = generateMaze(cols, rows);
    current = { col: 0, row: 0 };
    goal = pickGoal(maze, current);
    position = { ...current };
    route = [];
    fingerCell = null;
    tracks = [];
    facing = 1;
    hasMoved = false;
    ouchAt = -Infinity;
    phase = 'play';
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

  function cellAt(event: PointerEvent, keep: Cell | null): Cell | null {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - layout.originX) / layout.cell;
    const y = (event.clientY - rect.top - layout.originY) / layout.cell;
    return cellAtPoint(maze, x, y, keep, SLACK);
  }

  /** The touched cell when it is close enough along the tunnels to drive to. */
  function reachableCell(event: PointerEvent, keep: Cell | null): Cell | null {
    const cell = cellAt(event, keep);
    if (!cell || findPath(maze, current, cell).length - 1 > MAX_REACH) return null;
    return cell;
  }

  /** Plans a route to the driving finger's cell when it is close enough along the tunnels. */
  function steer(event: PointerEvent): boolean {
    const target = reachableCell(event, fingerCell);
    if (!target) {
      notePushingWall(event);
      return false;
    }
    stopPushing();
    fingerCell = target;
    activeHasSteered = true;
    const path = findPath(maze, current, target);
    const heading = route[0];
    // Mid-way between cells, turning around means driving back to the last cell first.
    const turnsBack = heading && !(path[1] && sameCell(path[1], heading));
    route = turnsBack ? [current, ...path.slice(1)] : path.slice(1);
    return true;
  }

  /**
   * Notes when the driving finger leaves its cell through a wall or off the maze.
   * A finger that merely runs ahead along an open tunnel is not pushing into a wall.
   */
  function notePushingWall(event: PointerEvent): void {
    if (!fingerCell || pushingWall) return;
    const from = fingerCell;
    const cell = cellAt(event, from);
    const throughWall = !cell || (!sameCell(cell, from) && !neighbors(maze, from).some((next) => sameCell(next, cell)));
    if (!throughWall) return;
    pushingWall = true;
  }

  /**
   * Bumps once the finger has kept pushing into a wall for a while with the vehicle stopped,
   * so brushing a wall on the way round a corner does not set it off.
   */
  function bumpWhenStuck(now: number): void {
    if (!pushingWall || moving) {
      stuckSince = null;
      return;
    }
    stuckSince ??= now;
    if (bumped || now - stuckSince < BUMP_HOLD_MS) return;
    bumped = true;
    playBump();
    ouchAt = now / 1000;
  }

  function stopPushing(): void {
    pushingWall = false;
    stuckSince = null;
    bumped = false;
  }

  function drive(event: PointerEvent): void {
    if (activePointer !== null) otherPointers.add(activePointer);
    otherPointers.delete(event.pointerId);
    activePointer = event.pointerId;
    activeHasSteered = false;
    fingerCell = null;
    stopPushing();
    steer(event);
  }

  function releasePointers(): void {
    activePointer = null;
    otherPointers.clear();
    fingerCell = null;
    stopPushing();
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
    phase = 'clear';
    // All smiles at the treasure, even right after a bump.
    ouchAt = -Infinity;
    route = [];
    releasePointers();
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
      // Time is up: this was the last maze, so go to bed instead of offering another.
      if (shouldLock(play.elapsedMs, false, limits)) {
        lock();
        return;
      }
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
    if (phase === 'locked') {
      drawBedtime(ctx, layout.width, layout.height, vehicle, time);
      return;
    }
    ctx.drawImage(background, 0, 0, layout.width, layout.height);
    drawTreadMarks(ctx, layout, tracks);

    const chest = cellCenter(layout, goal);
    if (phase !== 'clear') drawChest(ctx, chest.x, chest.y, layout.cell * 0.6, time, false);

    const driver = cellCenter(layout, position);
    const size = layout.cell * 0.78;
    const wiggle = time < hintUntil ? Math.sin(time * 30) * size * 0.04 : 0;
    const bob = moving ? Math.sin(time * 22) * size * 0.02 : 0;
    if (phase === 'play' && (!hasMoved || time < hintUntil)) drawHint(ctx, driver.x, driver.y, size * 0.6, time);
    const ouch = Math.min(1, Math.max(0, 1 - (time - ouchAt) / OUCH_SECONDS));
    const shake = reduceMotion.matches ? 0 : Math.sin(time * 70) * size * 0.04 * ouch ** 2;
    drawVehicle(ctx, vehicle, driver.x + wiggle + shake, driver.y, size, facing, bob, true, ouch);

    // Once found, the open chest pops up above the vehicle instead of hiding under it.
    if (phase === 'clear') drawChest(ctx, chest.x, chest.y - layout.cell * 0.45, layout.cell * 0.6, time, true);

    drawParticles(ctx, particles);
  }

  // Play time: counted only while the page is on screen, kept across reloads.
  const storage = (() => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  })();
  const limits = limitsFromQuery(location.search, isPreview || import.meta.env.DEV);
  let play: PlayState = loadPlayState(storage, storagePrefix);
  let lastTick = performance.now();
  let ticksSinceSave = 0;
  const lockScreen = setupLockScreen(lockElements, unlock);

  function save(): void {
    ticksSinceSave = 0;
    savePlayState(storage, storagePrefix, play);
  }

  function countPlayTime(): void {
    const now = performance.now();
    // Timers can stall (e.g. a sleeping device); never count a gap longer than a few ticks.
    const delta = Math.min(now - lastTick, TICK_MS * 5);
    lastTick = now;
    if (document.hidden || phase === 'locked') return;
    play.elapsedMs += delta;
    if (++ticksSinceSave >= SAVE_EVERY_TICKS) save();
    const inMaze = phase === 'play' || (phase === 'clear' && overlay.hidden === true);
    if (shouldLock(play.elapsedMs, inMaze, limits)) lock();
  }

  function lock(): void {
    phase = 'locked';
    play.locked = true;
    save();
    route = [];
    releasePointers();
    clearTimeout(overlayTimer);
    overlay.hidden = true;
    selectScreen.hidden = true;
    lockScreen.show();
  }

  function unlock(): void {
    play = { elapsedMs: 0, locked: false };
    save();
    lockScreen.hide();
    showSelect();
  }

  function showSelect(): void {
    phase = 'select';
    clearTimeout(overlayTimer);
    overlay.hidden = true;
    selectScreen.hidden = false;
    drawVehiclePictures();
    vehicleList.querySelector<HTMLButtonElement>(`[data-vehicle="${vehicle}"]`)?.focus();
  }

  /** Draws each choice's picture at the button's current size. */
  function drawVehiclePictures(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    for (const picture of vehicleList.querySelectorAll<HTMLCanvasElement>('canvas[data-vehicle]')) {
      const width = picture.clientWidth;
      const height = picture.clientHeight;
      picture.width = Math.round(width * dpr);
      picture.height = Math.round(height * dpr);
      const pictureCtx = picture.getContext('2d')!;
      pictureCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = Math.min(width, height * 1.1) * 0.82;
      drawVehicle(pictureCtx, picture.dataset.vehicle as VehicleId, width / 2, height * 0.56, size, 1, 0);
    }
  }

  for (const { id, name } of VEHICLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vehicle';
    button.dataset.vehicle = id;
    const picture = document.createElement('canvas');
    picture.dataset.vehicle = id;
    picture.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = name;
    button.append(picture, label);
    button.addEventListener('click', () => {
      unlockAudio();
      vehicle = id;
      selectScreen.hidden = true;
      newMaze();
    });
    vehicleList.append(button);
  }

  /**
   * A palm or another finger that lands first must not keep the real finger from driving:
   * while the driving touch has not steered yet, a touch within reach takes over.
   */
  function takeOver(event: PointerEvent): boolean {
    if (activeHasSteered || !reachableCell(event, null)) return false;
    drive(event);
    return true;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (phase !== 'play') return;
    unlockAudio();
    canvas.setPointerCapture(event.pointerId);
    if (activePointer === null) {
      drive(event);
      // A touch too far away gets a wiggle so the child knows where to start.
      if (!activeHasSteered) hintUntil = performance.now() / 1000 + 0.8;
    } else if (!takeOver(event)) {
      otherPointers.add(event.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (phase !== 'play') return;
    if (event.pointerId === activePointer) steer(event);
    else if (otherPointers.has(event.pointerId)) takeOver(event);
  });
  const release = (event: PointerEvent): void => {
    // Touches left behind (say, a resting palm) wait for a new finger rather than taking over.
    if (event.pointerId === activePointer) releasePointers();
    else otherPointers.delete(event.pointerId);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  againButton.addEventListener('click', () => {
    unlockAudio();
    newMaze();
  });
  changeButton.addEventListener('click', showSelect);
  window.addEventListener('resize', () => {
    resize();
    if (phase === 'select') drawVehiclePictures();
  });

  if (import.meta.env.DEV) {
    // Lets automated checks drive a finger along the solution; not in production builds.
    Object.assign(window, {
      __maze: {
        solution: () => findPath(maze, current, goal).map((cell) => cellCenter(layout, cell)),
        phase: () => phase,
        play: () => ({ ...play }),
        setElapsed: (ms: number) => void (play.elapsedMs = ms),
      },
    });
  }

  window.setInterval(countPlayTime, TICK_MS);
  document.addEventListener('visibilitychange', () => {
    lastTick = performance.now();
    if (document.hidden) save();
  });
  window.addEventListener('pagehide', save);

  // A maze sits behind the select screen so the canvas always has something to draw.
  newMaze();
  if (play.locked || shouldLock(play.elapsedMs, false, limits)) lock();
  else showSelect();
  let last = performance.now();
  const frame = (now: number): void => {
    update(Math.min((now - last) / 1000, 0.05));
    bumpWhenStuck(now);
    last = now;
    render(now / 1000);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
