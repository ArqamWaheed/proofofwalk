import { describe, expect, it } from "vitest";
import { commitFreshness, describeDelay } from "../freshness";

const walk = { t0: 1_000_000, dur: 1_500 };
const ended = walk.t0 + walk.dur;

describe("commitFreshness", () => {
  it("says nothing when the block time is missing", () => {
    expect(commitFreshness(walk, null)).toEqual({ kind: "unknown" });
  });

  it("treats a commit moments after the walk as prompt", () => {
    expect(commitFreshness(walk, ended + 30).kind).toBe("prompt");
  });

  it("tolerates small clock skew rather than crying foul", () => {
    // A block stamped slightly before the walk ended is a clock disagreement,
    // not evidence of anything.
    expect(commitFreshness(walk, ended - 60).kind).toBe("prompt");
  });

  it("flags a block written well before the walk could have ended", () => {
    const r = commitFreshness(walk, ended - 5_000);
    expect(r.kind).toBe("impossible");
  });

  it("separates same-day delay from a day or more", () => {
    expect(commitFreshness(walk, ended + 7_200).kind).toBe("delayed");
    expect(commitFreshness(walk, ended + 86_400 * 3).kind).toBe("stale");
  });

  it("catches the replay this exists for: last week's walk committed today", () => {
    const r = commitFreshness(walk, ended + 86_400 * 7);
    expect(r.kind).toBe("stale");
    expect(r.kind !== "unknown" && r.delaySeconds).toBe(86_400 * 7);
  });

  it("puts the hour boundary where it claims to", () => {
    expect(commitFreshness(walk, ended + 3_599).kind).toBe("prompt");
    expect(commitFreshness(walk, ended + 3_600).kind).toBe("delayed");
    expect(commitFreshness(walk, ended + 86_399).kind).toBe("delayed");
    expect(commitFreshness(walk, ended + 86_400).kind).toBe("stale");
  });
});

describe("describeDelay", () => {
  it("scales the unit to the size of the gap", () => {
    expect(describeDelay(45)).toBe("45 seconds");
    expect(describeDelay(600)).toBe("10 minutes");
    expect(describeDelay(7_200)).toBe("2 hours");
    expect(describeDelay(86_400 * 6)).toBe("6 days");
  });

  it("does not say '1 minutes'", () => {
    expect(describeDelay(90)).toBe("2 minutes");
    expect(describeDelay(3_600)).toBe("1 hour");
    expect(describeDelay(86_400)).toBe("1 day");
  });
});
