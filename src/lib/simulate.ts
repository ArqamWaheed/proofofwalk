import type { Fix } from "./trace";

/**
 * A synthetic walk, for judges and desktops.
 *
 * This exists because the honest demo of a walk-recording app requires a walk,
 * and nobody evaluating this at 2am is going to take a dog around the block.
 * It is labelled as simulated everywhere it surfaces, and the attestation it
 * produces is marked `sim` so a simulated walk can never be mistaken for a real
 * one — on screen or on chain.
 */
export function simulateWalk(opts?: { startedAt?: number }): Fix[] {
  // A loop around Zilker Park, Austin. Real coordinates, so the numbers that
  // come out the other end are plausible rather than invented.
  const origin = { lat: 30.2669, lon: -97.7729 };
  const t0 = opts?.startedAt ?? Math.floor(Date.now() / 1000) - 1500;

  const fixes: Fix[] = [];
  const steps = 100;
  for (let i = 0; i < steps; i++) {
    const phase = (i / steps) * Math.PI * 2;
    // ~380m by ~250m loop, with a little wander so the distance is not perfectly
    // smooth — a real trace never is.
    const wobble = Math.sin(phase * 7) * 0.00012;
    fixes.push({
      t: t0 + i * 15,
      lat: Math.round((origin.lat + Math.sin(phase) * 0.0017 + wobble) * 1e5) / 1e5,
      lon: Math.round((origin.lon + Math.cos(phase) * 0.0011 + wobble) * 1e5) / 1e5,
    });
  }
  return fixes;
}
