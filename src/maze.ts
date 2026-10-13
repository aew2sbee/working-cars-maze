// Perfect maze on a grid: every cell is reachable from every other by exactly one route.

export interface Cell {
  col: number;
  row: number;
}

export interface Maze {
  cols: number;
  rows: number;
  /** Bitmask of open sides (N/E/S/W) per cell, indexed by row * cols + col. */
  open: Uint8Array;
}

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

const STEPS = [
  { bit: N, back: S, dc: 0, dr: -1 },
  { bit: E, back: W, dc: 1, dr: 0 },
  { bit: S, back: N, dc: 0, dr: 1 },
  { bit: W, back: E, dc: -1, dr: 0 },
] as const;

/** About how many cells a maze has, whatever the screen, so phones and tablets are equally hard. */
export const TARGET_CELLS = 30;
/** Smallest cell a small finger can still trace, in CSS pixels. */
export const MIN_CELL = 80;
const MAX_COLS = 8;
const MAX_ROWS = 9;

/**
 * Picks columns and rows for the play area: as close to TARGET_CELLS as cells of at least
 * MIN_CELL allow, preferring grids that fill the area without much empty space.
 */
export function chooseGrid(width: number, height: number): { cols: number; rows: number } {
  let best = { cols: 3, rows: 3 };
  let bestScore = Infinity;
  for (let cols = 3; cols <= MAX_COLS; cols++) {
    for (let rows = 3; rows <= MAX_ROWS; rows++) {
      const cell = Math.min(width / cols, height / rows);
      if (cell < MIN_CELL) continue;
      const unused = 1 - (cols * rows * cell * cell) / (width * height);
      const score = Math.abs(cols * rows - TARGET_CELLS) + unused * 10;
      if (score < bestScore) {
        bestScore = score;
        best = { cols, rows };
      }
    }
  }
  return best;
}

/**
 * The cell under a point given in cell units, or null off the grid. A point still within
 * `slack` cells of `keep` stays on `keep`, so a wide, pressing finger resting on a boundary
 * does not flicker into the cell next door (possibly across a wall).
 */
export function cellAtPoint(maze: Maze, x: number, y: number, keep: Cell | null, slack: number): Cell | null {
  if (
    keep &&
    x >= keep.col - slack &&
    x < keep.col + 1 + slack &&
    y >= keep.row - slack &&
    y < keep.row + 1 + slack
  ) {
    return keep;
  }
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (col < 0 || row < 0 || col >= maze.cols || row >= maze.rows) return null;
  return { col, row };
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}

/** Carves a maze with a randomized depth-first search starting from the top-left cell. */
export function generateMaze(cols: number, rows: number, random: () => number = Math.random): Maze {
  const open = new Uint8Array(cols * rows);
  const visited = new Uint8Array(cols * rows);
  const stack = [0];
  visited[0] = 1;

  while (stack.length > 0) {
    const index = stack[stack.length - 1];
    const col = index % cols;
    const row = (index - col) / cols;
    const options = STEPS.filter((step) => {
      const c = col + step.dc;
      const r = row + step.dr;
      return c >= 0 && c < cols && r >= 0 && r < rows && !visited[r * cols + c];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const step = options[Math.floor(random() * options.length)];
    const next = (row + step.dr) * cols + col + step.dc;
    open[index] |= step.bit;
    open[next] |= step.back;
    visited[next] = 1;
    stack.push(next);
  }

  return { cols, rows, open };
}

export function isOpen(maze: Maze, cell: Cell, side: number): boolean {
  return (maze.open[cell.row * maze.cols + cell.col] & side) !== 0;
}

export function neighbors(maze: Maze, cell: Cell): Cell[] {
  return STEPS.filter((step) => isOpen(maze, cell, step.bit)).map((step) => ({
    col: cell.col + step.dc,
    row: cell.row + step.dr,
  }));
}

/** Number of steps along the tunnels from `from` to every cell, indexed like `open`. */
export function distancesFrom(maze: Maze, from: Cell): Int32Array {
  const distance = new Int32Array(maze.cols * maze.rows).fill(-1);
  distance[from.row * maze.cols + from.col] = 0;
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    const here = distance[cell.row * maze.cols + cell.col];
    for (const next of neighbors(maze, cell)) {
      const index = next.row * maze.cols + next.col;
      if (distance[index] < 0) {
        distance[index] = here + 1;
        queue.push(next);
      }
    }
  }
  return distance;
}

export const MAX_TREASURES = 3;
/** Mazes to clear before each extra treasure. */
const CLEARS_PER_TREASURE = 3;

/** One treasure to start with, one more every few mazes cleared, up to MAX_TREASURES. */
export function treasureCount(cleared: number): number {
  return Math.min(MAX_TREASURES, 1 + Math.floor(cleared / CLEARS_PER_TREASURE));
}

/**
 * Picks dead ends for the treasures, so they are somewhere new each time.
 * Dead ends at least half as far as the farthest one come first, so the way is never trivially short;
 * a maze without enough of them falls back to nearer dead ends, then to any far cell.
 */
export function pickTreasures(maze: Maze, start: Cell, count: number, random: () => number = Math.random): Cell[] {
  const distance = distancesFrom(maze, start);
  const cells: { cell: Cell; steps: number; deadEnd: boolean }[] = [];
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      const cell = { col, row };
      if (sameCell(cell, start)) continue;
      cells.push({ cell, steps: distance[row * maze.cols + col], deadEnd: neighbors(maze, cell).length === 1 });
    }
  }
  const farthest = Math.max(...cells.filter((c) => c.deadEnd).map((c) => c.steps));
  const isFar = (c: (typeof cells)[number]): boolean => c.deadEnd && c.steps * 2 >= farthest;
  const far = cells.filter(isFar);
  const picked: Cell[] = [];
  while (picked.length < count && far.length > 0) {
    picked.push(far.splice(Math.floor(random() * far.length), 1)[0].cell);
  }
  if (picked.length === count) return picked;
  const rest = cells
    .filter((c) => !isFar(c))
    .sort((a, b) => Number(b.deadEnd) - Number(a.deadEnd) || b.steps - a.steps);
  return [...picked, ...rest.slice(0, count - picked.length).map((c) => c.cell)];
}

/** Shortest route through open sides, including both ends. */
export function findPath(maze: Maze, from: Cell, to: Cell): Cell[] {
  const key = (cell: Cell): number => cell.row * maze.cols + cell.col;
  const previous = new Map<number, Cell | null>([[key(from), null]]);
  const queue = [from];

  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (sameCell(cell, to)) break;
    for (const next of neighbors(maze, cell)) {
      if (!previous.has(key(next))) {
        previous.set(key(next), cell);
        queue.push(next);
      }
    }
  }

  const path: Cell[] = [];
  for (let cell: Cell | null | undefined = to; cell; cell = previous.get(key(cell))) {
    path.unshift(cell);
  }
  return path;
}
