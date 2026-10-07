import { describe, expect, it } from 'vitest';
import { E, findPath, generateMaze, isOpen, neighbors, S, sameCell } from './maze';
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
