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
