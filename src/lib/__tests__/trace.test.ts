import { describe, expect, it } from "vitest";
import {
  canonicalise, durationSeconds, hashTrace, metresBetween, totalMetres, type Fix, type Trace,
} from "../trace";

const fix = (t: number, lat: number, lon: number): Fix => ({ t, lat, lon });

const trace: Trace = {
  version: 1,
  dog: "Rufus",
  fixes: [fix(1000, 30.2669, -97.7729), fix(1015, 30.267, -97.773)],
};

describe("canonicalise", () => {
  it("is a stable wire format", () => {
    // Pinned on purpose. If this string changes, every attestation already
    // committed on chain stops verifying — so a failure here is a design
    // decision to make deliberately, not a test to update.
    expect(canonicalise(trace)).toBe(
      "v1\nRufus\n1000,30.26690,-97.77290\n1015,30.26700,-97.77300",
    );
  });

  it("pins coordinates to 5dp so excess GPS precision cannot change the hash", () => {
    const noisy: Trace = { ...trace, fixes: [fix(1000, 30.26690004, -97.77290002), trace.fixes[1]] };
    expect(canonicalise(noisy)).toBe(canonicalise(trace));
  });

  it("does not depend on key order in the fix objects", () => {
    const reordered = {
      version: 1 as const,
      dog: "Rufus",
      fixes: [
        { lon: -97.7729, lat: 30.2669, t: 1000 },
        { lat: 30.267, t: 1015, lon: -97.773 },
      ],
    };
    expect(canonicalise(reordered)).toBe(canonicalise(trace));
  });

  it("distinguishes traces that differ only by dog", () => {
    expect(canonicalise({ ...trace, dog: "Bella" })).not.toBe(canonicalise(trace));
  });
});

describe("hashTrace", () => {
  it("is deterministic across calls", async () => {
    expect(await hashTrace(trace)).toBe(await hashTrace(trace));
  });

  it("returns a 64-character hex digest", async () => {
    expect(await hashTrace(trace)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when a single fix is dropped", async () => {
    const shorter: Trace = { ...trace, fixes: [trace.fixes[0]] };
    expect(await hashTrace(shorter)).not.toBe(await hashTrace(trace));
  });

  it("changes when a coordinate moves by more than the pinned precision", async () => {
    const moved: Trace = { ...trace, fixes: [fix(1000, 30.2679, -97.7729), trace.fixes[1]] };
    expect(await hashTrace(moved)).not.toBe(await hashTrace(trace));
  });
});

describe("metresBetween", () => {
  it("matches a known distance", () => {
    // One degree of latitude is ~111.2 km.
    expect(metresBetween(fix(0, 30, -97), fix(0, 31, -97))).toBeCloseTo(111_195, -2);
  });

  it("is zero for identical points", () => {
    expect(metresBetween(fix(0, 30.2669, -97.7729), fix(0, 30.2669, -97.7729))).toBe(0);
  });
});

describe("totalMetres", () => {
  it("gates out sub-threshold jitter so a stationary phone walks nowhere", () => {
    // ~0.1 m apart: a parked phone's GPS wander, repeated 50 times.
    const jitter = Array.from({ length: 50 }, (_, i) =>
      fix(1000 + i, 30.2669 + (i % 2) * 0.000001, -97.7729),
    );
    expect(totalMetres(jitter)).toBe(0);
  });

  it("accumulates real movement", () => {
    const walked = [fix(0, 30.2669, -97.7729), fix(30, 30.2679, -97.7729)];
    expect(totalMetres(walked)).toBeGreaterThan(100);
  });

  it("is zero for a single fix", () => {
    expect(totalMetres([fix(0, 30, -97)])).toBe(0);
  });
});

describe("durationSeconds", () => {
  it("spans first to last fix", () => {
    expect(durationSeconds(trace.fixes)).toBe(15);
  });

  it("is zero when there is nothing to span", () => {
    expect(durationSeconds([])).toBe(0);
    expect(durationSeconds([fix(1000, 30, -97)])).toBe(0);
  });
});
