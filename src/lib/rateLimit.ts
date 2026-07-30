// Client-side rate limiter stored in sessionStorage (per browser session)
// Does NOT replace server-side controls — defence in depth layer only.

const WINDOW_MS = 60_000;   // 1-minute sliding window
const MAX_ATTEMPTS = 5;      // attempts before lockout
const LOCKOUT_MS = 5 * 60_000; // 5-minute lockout

interface Entry {
  attempts: number;
  windowStart: number;
  lockedUntil?: number;
}

function load(key: string): Entry {
  try {
    const raw = sessionStorage.getItem(`rl_${key}`);
    return raw ? (JSON.parse(raw) as Entry) : { attempts: 0, windowStart: Date.now() };
  } catch {
    return { attempts: 0, windowStart: Date.now() };
  }
}

function save(key: string, e: Entry) {
  try { sessionStorage.setItem(`rl_${key}`, JSON.stringify(e)); } catch { /* noop */ }
}

/** Returns whether the action is allowed, and how many seconds to wait if not. */
export function checkRateLimit(key: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const e = load(key);

  if (e.lockedUntil && now < e.lockedUntil) {
    return { allowed: false, waitSeconds: Math.ceil((e.lockedUntil - now) / 1000) };
  }

  if (now - e.windowStart > WINDOW_MS) {
    save(key, { attempts: 0, windowStart: now });
  }

  return { allowed: true };
}

/** Call on every failed attempt. Returns lock state after increment. */
export function recordFailedAttempt(key: string): { locked: boolean; waitSeconds?: number } {
  const now = Date.now();
  const e = load(key);

  if (now - e.windowStart > WINDOW_MS) {
    e.attempts = 0;
    e.windowStart = now;
    delete e.lockedUntil;
  }

  e.attempts += 1;

  if (e.attempts >= MAX_ATTEMPTS) {
    e.lockedUntil = now + LOCKOUT_MS;
    save(key, e);
    return { locked: true, waitSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }

  save(key, e);
  return { locked: false };
}

/** Clear limits on successful auth (reset after legit login). */
export function clearRateLimit(key: string) {
  try { sessionStorage.removeItem(`rl_${key}`); } catch { /* noop */ }
}
