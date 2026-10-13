import { describe, expect, it } from 'vitest';
import { cellAtPoint, chooseGrid, distancesFrom, E, findPath, MAX_TREASURES, MIN_CELL, TARGET_CELLS, generateMaze, isOpen, neighbors, pickTreasures, S, sameCell, treasureCount } from './maze';
import { mulberry32 } from './random';

const sizes: [number, number][] = [
  [3, 3],
  [3, 5],
  [7, 5],
  [6, 6],
];

describe('generateMaze', () => {
  it.each(sizes)('%i x %i is a perfect maze', (cols, rows) => {
    for (let seed = 1; seed <= 20; seed++) {
      const maze = generateMaze(cols, rows, mulberry32(seed));

      let passages = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = { col, row };
          if (isOpen(maze, cell, E)) passages++;
          if (isOpen(maze, cell, S)) passages++;
          for (const next of neighbors(maze, cell)) {
            expect(next.col).toBeGreaterThanOrEqual(0);
            expect(next.col).toBeLessThan(cols);
            expect(next.row).toBeGreaterThanOrEqual(0);
            expect(next.row).toBeLessThan(rows);
            expect(neighbors(maze, next).some((back) => sameCell(back, cell))).toBe(true);
          }
        }
      }
      // A spanning tree: one passage fewer than cells, and every cell reachable.
      expect(passages).toBe(cols * rows - 1);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const path = findPath(maze, { col: 0, row: 0 }, { col, row });
          expect(path[0]).toEqual({ col: 0, row: 0 });
          expect(path[path.length - 1]).toEqual({ col, row });
        }
      }
    }
  });
});

describe('treasureCount', () => {
  it('adds a treasure every three mazes cleared, up to three', () => {
    expect([0, 1, 2, 3, 5, 6, 8, 9, 100].map(treasureCount)).toEqual([1, 1, 1, 2, 2, 3, 3, 3, 3]);
  });
});

describe('pickTreasures', () => {
  it.each(sizes)('%i x %i puts the treasure at a far dead end, not the start', (cols, rows) => {
    const start = { col: 0, row: 0 };
    const goals = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const maze = generateMaze(cols, rows, mulberry32(seed));
      const [goal] = pickTreasures(maze, start, 1, mulberry32(seed + 1000));
      const distance = distancesFrom(maze, start);
      const deadEndSteps = [];
      for (let i = 0; i < cols * rows; i++) {
        const cell = { col: i % cols, row: Math.floor(i / cols) };
        if (i !== 0 && neighbors(maze, cell).length === 1) deadEndSteps.push(distance[i]);
      }

      expect(sameCell(goal, start)).toBe(false);
      expect(neighbors(maze, goal)).toHaveLength(1);
      expect(distance[goal.row * cols + goal.col] * 2).toBeGreaterThanOrEqual(Math.max(...deadEndSteps));
      goals.add(`${goal.col},${goal.row}`);
    }
    // Not always the same corner.
    expect(goals.size).toBeGreaterThan(1);
  });

  it.each(sizes)('%i x %i finds as many different treasures as asked, never at the start', (cols, rows) => {
    const start = { col: 0, row: 0 };
    for (let seed = 1; seed <= 30; seed++) {
      const maze = generateMaze(cols, rows, mulberry32(seed));
      for (let count = 1; count <= MAX_TREASURES; count++) {
        const treasures = pickTreasures(maze, start, count, mulberry32(seed + 1000));
        expect(treasures).toHaveLength(count);
        expect(new Set(treasures.map((cell) => `${cell.col},${cell.row}`)).size).toBe(count);
        expect(treasures.some((cell) => sameCell(cell, start))).toBe(false);
      }
    }
  });

  it('falls back to other cells when the maze has too few dead ends', () => {
    // A single corridor 0,0 → 3,0: the only dead end besides the start is the far end.
    const maze = generateMaze(4, 1, mulberry32(1));
    const treasures = pickTreasures(maze, { col: 0, row: 0 }, 3, mulberry32(2));
    expect(treasures).toEqual([
      { col: 3, row: 0 },
      { col: 2, row: 0 },
      { col: 1, row: 0 },
    ]);
  });
});

describe('chooseGrid', () => {
  // Play areas (CSS px, below the grass and inside the safe area) of common screens.
  it.each([
    ['iPhone portrait', 358, 700],
    ['iPhone landscape', 760, 270],
    ['iPad portrait', 788, 1060],
    ['iPad landscape', 1148, 704],
    ['small Android portrait', 328, 600],
  ])('%s gets cells big enough for a finger', (_, width, height) => {
    const { cols, rows } = chooseGrid(width, height);
    expect(Math.min(width / cols, height / rows)).toBeGreaterThanOrEqual(MIN_CELL);
    expect(cols).toBeGreaterThanOrEqual(3);
    expect(rows).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['iPhone portrait', 358, 700],
    ['iPad portrait', 788, 1060],
    ['iPad landscape', 1148, 704],
  ])('%s gets about the same number of cells', (_, width, height) => {
    const { cols, rows } = chooseGrid(width, height);
    expect(Math.abs(cols * rows - TARGET_CELLS)).toBeLessThanOrEqual(4);
  });

  it('falls back to the smallest maze on a tiny screen', () => {
    expect(chooseGrid(200, 200)).toEqual({ cols: 3, rows: 3 });
  });
});

describe('findPath', () => {
  it('moves one open side at a time', () => {
    const maze = generateMaze(5, 4, mulberry32(7));
    const path = findPath(maze, { col: 0, row: 0 }, { col: 4, row: 3 });
    for (let i = 1; i < path.length; i++) {
      expect(neighbors(maze, path[i - 1]).some((cell) => sameCell(cell, path[i]))).toBe(true);
    }
  });

  it('returns just the cell when start and goal match', () => {
    const maze = generateMaze(3, 3, mulberry32(1));
    expect(findPath(maze, { col: 1, row: 1 }, { col: 1, row: 1 })).toEqual([{ col: 1, row: 1 }]);
  });
});

describe('cellAtPoint', () => {
  const maze = generateMaze(4, 3, mulberry32(1));

  it('picks the cell under the point', () => {
    expect(cellAtPoint(maze, 2.5, 1.5, null, 0.3)).toEqual({ col: 2, row: 1 });
  });

  it('returns null off the grid', () => {
    expect(cellAtPoint(maze, -0.1, 1, null, 0.3)).toBeNull();
    expect(cellAtPoint(maze, 1, 3.2, null, 0.3)).toBeNull();
  });

  it('stays on the kept cell until the point is well past its edge', () => {
    const keep = { col: 1, row: 1 };
    expect(cellAtPoint(maze, 2.25, 1.5, keep, 0.3)).toBe(keep);
    expect(cellAtPoint(maze, 1.5, 0.75, keep, 0.3)).toBe(keep);
    expect(cellAtPoint(maze, 2.35, 1.5, keep, 0.3)).toEqual({ col: 2, row: 1 });
  });
});
