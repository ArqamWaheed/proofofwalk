/**
 * A walk trace, and the one rule that makes it verifiable: the bytes we hash
 * must be reproducible byte-for-byte, months later, on someone else's machine.
 *
 * Everything here is deliberately boring for that reason. Fixed precision,
 * fixed key order, no floats in the serialised form beyond what we pin.
 */

export type Fix = {
  /** Unix seconds. Whole seconds only — millisecond jitter is not signal. */
  t: number;
  /** Degrees, rounded to 5dp (~1.1m at the equator). */
  lat: number;
  lon: number;
};

export type Trace = {
  version: 1;
  dog: string;
  fixes: Fix[];
};

/** GPS gives us more precision than it has accuracy. Pin it so hashes reproduce. */
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export function toFix(p: GeolocationPosition): Fix {
  return {
    t: Math.floor(p.timestamp / 1000),
    lat: round5(p.coords.latitude),
    lon: round5(p.coords.longitude),
  };
}

/**
 * Canonical form. Not JSON.stringify(trace) — key order in an object literal is
 * an implementation detail we would be betting the whole verification on.
 * This writes the fields positionally, in an order fixed by this function.
 */
export function canonicalise(trace: Trace): string {
  const rows = trace.fixes.map((f) => `${f.t},${f.lat.toFixed(5)},${f.lon.toFixed(5)}`);
  return [`v${trace.version}`, trace.dog, ...rows].join("\n");
}

export async function hashTrace(trace: Trace): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalise(trace));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EARTH_M = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Haversine. Good to ~0.5% at walk distances, which is well inside GPS noise. */
export function metresBetween(a: Fix, b: Fix): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

/**
 * Total distance, with a noise gate. A phone sitting still reports a jittering
 * position; summed naively that invents hundreds of metres of "walk". Fixes
 * closer together than GPS can resolve are treated as the same place.
 */
export function totalMetres(fixes: Fix[], gateM = 3): number {
  let sum = 0;
  for (let i = 1; i < fixes.length; i++) {
    const d = metresBetween(fixes[i - 1], fixes[i]);
    if (d >= gateM) sum += d;
  }
  return Math.round(sum);
}

export function durationSeconds(fixes: Fix[]): number {
  if (fixes.length < 2) return 0;
  return fixes[fixes.length - 1].t - fixes[0].t;
}
