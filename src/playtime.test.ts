import { describe, expect, it } from 'vitest';
import {
  bedtime,
  DEFAULT_LIMITS,
  GRACE_MS,
  limitsFromQuery,
  loadPlayState,
  makeProblem,
  PLAY_LIMIT_MS,
  savePlayState,
} from './playtime';
import { mulberry32 } from './random';

describe('bedtime', () => {
  const at = (elapsedMs: number, lastRoundFrom: number | null = null) => ({ elapsedMs, lastRoundFrom });

  it('keeps playing before 25 minutes', () => {
    expect(bedtime(at(PLAY_LIMIT_MS - 1), false)).toBe('play');
    expect(bedtime(at(PLAY_LIMIT_MS - 1), true)).toBe('play');
  });

  it('asks about one more maze at 25 minutes outside a maze', () => {
    expect(bedtime(at(PLAY_LIMIT_MS), false)).toBe('ask');
  });

  it('lets a maze in progress finish, for up to 5 more minutes', () => {
    expect(bedtime(at(PLAY_LIMIT_MS), true)).toBe('play');
    expect(bedtime(at(PLAY_LIMIT_MS + GRACE_MS - 1), true)).toBe('play');
    expect(bedtime(at(PLAY_LIMIT_MS + GRACE_MS), true)).toBe('lock');
  });

  it('locks when nobody answers the question within 5 minutes', () => {
    expect(bedtime(at(PLAY_LIMIT_MS + GRACE_MS - 1), false)).toBe('ask');
    expect(bedtime(at(PLAY_LIMIT_MS + GRACE_MS), false)).toBe('lock');
  });

  it('gives the one more maze its own 5 minutes, in or out of the maze', () => {
    const from = PLAY_LIMIT_MS + 4 * 60_000;
    expect(bedtime(at(from, from), false)).toBe('play');
    expect(bedtime(at(from + GRACE_MS - 1, from), true)).toBe('play');
    expect(bedtime(at(from + GRACE_MS, from), true)).toBe('lock');
    expect(bedtime(at(from + GRACE_MS, from), false)).toBe('lock');
  });
});

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

describe('play state storage', () => {
  it('keeps the lock and the time across a reload', () => {
    const storage = memoryStorage();
    savePlayState(storage, 'p:', { elapsedMs: 1234, locked: true, lastRoundFrom: null });
    expect(loadPlayState(storage, 'p:')).toEqual({ elapsedMs: 1234, locked: true, lastRoundFrom: null });
  });

  it('remembers that the one more maze was already chosen', () => {
    const storage = memoryStorage();
    savePlayState(storage, 'p:', { elapsedMs: 1600, locked: false, lastRoundFrom: 1500 });
    expect(loadPlayState(storage, 'p:')).toEqual({ elapsedMs: 1600, locked: false, lastRoundFrom: 1500 });
  });

  it('keeps production and each preview apart by prefix', () => {
    const storage = memoryStorage();
    savePlayState(storage, '/working-cars-maze/:', { elapsedMs: 1, locked: true, lastRoundFrom: null });
    expect(loadPlayState(storage, '/working-cars-maze/pr-preview/pr-5/:')).toEqual({ elapsedMs: 0, locked: false, lastRoundFrom: null });
  });

  it('starts fresh when nothing is saved, the data is damaged or storage is unavailable', () => {
    const storage = memoryStorage();
    expect(loadPlayState(storage, 'p:')).toEqual({ elapsedMs: 0, locked: false, lastRoundFrom: null });
    storage.setItem('p:playtime', '{not json');
    expect(loadPlayState(storage, 'p:')).toEqual({ elapsedMs: 0, locked: false, lastRoundFrom: null });
    storage.setItem('p:playtime', JSON.stringify({ elapsedMs: -5, locked: 'yes' }));
    expect(loadPlayState(storage, 'p:')).toEqual({ elapsedMs: 0, locked: false, lastRoundFrom: null });
    expect(loadPlayState(undefined, 'p:')).toEqual({ elapsedMs: 0, locked: false, lastRoundFrom: null });
  });

  it('does not throw when storage refuses to save', () => {
    const full = { setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(() => savePlayState(full, 'p:', { elapsedMs: 1, locked: false, lastRoundFrom: null })).not.toThrow();
  });
});

describe('makeProblem', () => {
  it('multiplies two numbers from 3 to 9', () => {
    const random = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const { a, b, answer } = makeProblem(random);
      expect(a).toBeGreaterThanOrEqual(3);
      expect(a).toBeLessThanOrEqual(9);
      expect(b).toBeGreaterThanOrEqual(3);
      expect(b).toBeLessThanOrEqual(9);
      expect(answer).toBe(a * b);
    }
  });

  it('never repeats the previous problem', () => {
    const random = mulberry32(9);
    let previous = makeProblem(random);
    for (let i = 0; i < 200; i++) {
      const next = makeProblem(random, previous);
      expect([next.a, next.b]).not.toEqual([previous.a, previous.b]);
      previous = next;
    }
  });
});

describe('limitsFromQuery', () => {
  it('shortens the limit in previews', () => {
    expect(limitsFromQuery('?limit=1', true)).toEqual({ limitMs: 60_000, graceMs: 12_000 });
  });

  it('ignores the query in production and bad values anywhere', () => {
    expect(limitsFromQuery('?limit=1', false)).toBe(DEFAULT_LIMITS);
    expect(limitsFromQuery('?limit=abc', true)).toBe(DEFAULT_LIMITS);
    expect(limitsFromQuery('?limit=-3', true)).toBe(DEFAULT_LIMITS);
    expect(limitsFromQuery('', true)).toBe(DEFAULT_LIMITS);
  });
});
