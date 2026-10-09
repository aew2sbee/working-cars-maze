// Too-much-play guard: after 25 minutes of play an adult has to unlock the game.

/** Total play time before the game locks. */
export const PLAY_LIMIT_MS = 25 * 60_000;
/** Extra time to finish the maze in progress, or the one more maze, before locking anyway. */
export const GRACE_MS = 5 * 60_000;

export interface PlayState {
  /** Play time counted so far, only while the screen was showing. */
  elapsedMs: number;
  locked: boolean;
  /** When time ran out and "あと いっかい" was chosen, the play time at that moment. */
  lastRoundFrom: number | null;
}

export interface Limits {
  limitMs: number;
  graceMs: number;
}

export const DEFAULT_LIMITS: Limits = { limitMs: PLAY_LIMIT_MS, graceMs: GRACE_MS };

/**
 * What time being up means right now: nothing yet, ask whether to play one more maze, or lock.
 * A maze in progress may be finished first, and so may the one more maze, each within the grace period.
 */
export function bedtime(
  { elapsedMs, lastRoundFrom }: Pick<PlayState, 'elapsedMs' | 'lastRoundFrom'>,
  inMaze: boolean,
  limits: Limits = DEFAULT_LIMITS,
): 'play' | 'ask' | 'lock' {
  if (elapsedMs < limits.limitMs) return 'play';
  if (lastRoundFrom !== null) return elapsedMs >= lastRoundFrom + limits.graceMs ? 'lock' : 'play';
  // The question waits for a button however long it takes; only a maze in progress runs out.
  if (!inMaze) return 'ask';
  return elapsedMs >= limits.limitMs + limits.graceMs ? 'lock' : 'play';
}

/** The storage key, also used to spot another tab saving through the `storage` event. */
export function playStateKey(prefix: string): string {
  return prefix + 'playtime';
}

/** The saved state exactly as stored, to tell whether another tab has saved since. */
export function savedPlayState(storage: Pick<Storage, 'getItem'> | undefined, prefix: string): string | null {
  try {
    return storage?.getItem(playStateKey(prefix)) ?? null;
  } catch {
    return null;
  }
}

/** Reads the saved state; anything missing or damaged counts as a fresh start. */
export function loadPlayState(storage: Pick<Storage, 'getItem'> | undefined, prefix: string): PlayState {
  return parsePlayState(savedPlayState(storage, prefix));
}

export function parsePlayState(saved: string | null): PlayState {
  try {
    const state = JSON.parse(saved ?? 'null') as Partial<PlayState> | null;
    const elapsedMs = Number(state?.elapsedMs);
    const lastRoundFrom = state?.lastRoundFrom;
    return {
      elapsedMs: Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0,
      locked: state?.locked === true,
      lastRoundFrom: typeof lastRoundFrom === 'number' && Number.isFinite(lastRoundFrom) ? lastRoundFrom : null,
    };
  } catch {
    return { elapsedMs: 0, locked: false, lastRoundFrom: null };
  }
}

/** Saves the state and returns it as stored, or null when it could not be saved. */
export function savePlayState(storage: Pick<Storage, 'setItem'> | undefined, prefix: string, state: PlayState): string | null {
  if (!storage) return null;
  const saved = JSON.stringify(state);
  try {
    storage.setItem(playStateKey(prefix), saved);
    return saved;
  } catch {
    // Private mode or full storage: keep counting in memory.
    return null;
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
