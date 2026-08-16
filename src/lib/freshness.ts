/**
 * How long after the walk ended was it committed?
 *
 * The hash proves *which* route was recorded. It says nothing about *when* the
 * record was made, and that leaves a gap a walker can stand in: record one good
 * walk, keep the trace, and commit it again next week. The hash matches
 * perfectly, because it is genuinely the same walk — just not today's.
 *
 * The block timestamp is the one clock in this system the walker does not
 * control. Comparing it against the trace's own end time turns a replayed walk
 * into something the owner can see.
 *
 * This reports a fact, not a verdict. A long delay has innocent explanations —
 * a phone with no signal until the walker got home, a relay retried hours later.
 * The UI says what the gap is and lets the reader decide.
 */

export type Freshness =
  /** No block time available; nothing can be said. */
  | { kind: "unknown" }
  /** Block written before the walk ended. Clock skew, or a fabricated trace. */
  | { kind: "impossible"; delaySeconds: number }
  /** Committed while the walk was plausibly still fresh. */
  | { kind: "prompt"; delaySeconds: number }
  /** Same day, but not immediate. */
  | { kind: "delayed"; delaySeconds: number }
  /** A day or more later. Worth the owner's attention. */
  | { kind: "stale"; delaySeconds: number };

/** Block timestamps and phone clocks disagree by seconds; don't cry foul over that. */
const SKEW_TOLERANCE_S = 300;
const ONE_HOUR_S = 3_600;
const ONE_DAY_S = 86_400;

export function commitFreshness(
  attestation: { t0: number; dur: number },
  blockTime: number | null,
): Freshness {
  if (blockTime === null || !Number.isFinite(blockTime)) return { kind: "unknown" };

  const walkEnded = attestation.t0 + attestation.dur;
  const delaySeconds = blockTime - walkEnded;

  if (delaySeconds < -SKEW_TOLERANCE_S) return { kind: "impossible", delaySeconds };
  if (delaySeconds < ONE_HOUR_S) return { kind: "prompt", delaySeconds };
  if (delaySeconds < ONE_DAY_S) return { kind: "delayed", delaySeconds };
  return { kind: "stale", delaySeconds };
}

/** "3 minutes", "4 hours", "6 days" — coarse on purpose; precision implies rigour we don't have. */
export function describeDelay(seconds: number): string {
  const s = Math.abs(Math.round(seconds));
  if (s < 90) return `${s} seconds`;
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(s / ONE_HOUR_S);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(s / ONE_DAY_S);
  return `${days} day${days === 1 ? "" : "s"}`;
}
