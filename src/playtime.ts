// Too-much-play guard: after 25 minutes of play an adult has to unlock the game.

/** Total play time before the game locks. */
export const PLAY_LIMIT_MS = 25 * 60_000;
/** Extra time to finish the maze in progress before locking anyway. */
export const GRACE_MS = 5 * 60_000;

export interface PlayState {
  /** Play time counted so far, only while the screen was showing. */
  elapsedMs: number;
  locked: boolean;
}

export interface Limits {
  limitMs: number;
  graceMs: number;
}

export const DEFAULT_LIMITS: Limits = { limitMs: PLAY_LIMIT_MS, graceMs: GRACE_MS };

/**
 * Whether to lock right now. A maze in progress may be finished first,
 * but only within the grace period.
 */
export function shouldLock(elapsedMs: number, inMaze: boolean, limits: Limits = DEFAULT_LIMITS): boolean {
  if (elapsedMs < limits.limitMs) return false;
  return !inMaze || elapsedMs >= limits.limitMs + limits.graceMs;
}

const KEY = 'playtime';

/** Reads the saved state; anything missing or damaged counts as a fresh start. */
export function loadPlayState(storage: Pick<Storage, 'getItem'> | undefined, prefix: string): PlayState {
  try {
    const saved = JSON.parse(storage?.getItem(prefix + KEY) ?? 'null') as Partial<PlayState> | null;
    const elapsedMs = Number(saved?.elapsedMs);
    return {
      elapsedMs: Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0,
      locked: saved?.locked === true,
    };
  } catch {
    return { elapsedMs: 0, locked: false };
  }
}

export function savePlayState(storage: Pick<Storage, 'setItem'> | undefined, prefix: string, state: PlayState): void {
  try {
    storage?.setItem(prefix + KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: keep counting in memory.
  }
}

export interface Problem {
  a: number;
  b: number;
  answer: number;
}

/** A multiplication an adult can do at a glance but a three-year-old cannot. */
export function makeProblem(random: () => number = Math.random, previous?: Problem): Problem {
  for (;;) {
    const a = 3 + Math.floor(random() * 7);
    const b = 3 + Math.floor(random() * 7);
    if (!previous || a !== previous.a || b !== previous.b) return { a, b, answer: a * b };
  }
}

/**
 * PR previews and the dev server accept `?limit=<minutes>` so the lock can be tried
 * without waiting 25 minutes. Production always uses the real limits.
 */
export function limitsFromQuery(search: string, allowOverride: boolean): Limits {
  if (!allowOverride) return DEFAULT_LIMITS;
  const minutes = Number(new URLSearchParams(search).get('limit'));
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_LIMITS;
  const limitMs = minutes * 60_000;
  return { limitMs, graceMs: limitMs / 5 };
}
