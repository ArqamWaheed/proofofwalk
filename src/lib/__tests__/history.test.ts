import { describe, expect, it } from "vitest";
import { summarise, type Walk } from "../history";
import type { Attestation } from "../attest";

const walk = (dog: string, dist: number, dur: number, sim?: 1): Walk => ({
  signature: `sig-${dog}-${dist}`,
  blockTime: 1_700_000_000,
  attestation: { v: 1, dog, t0: 1_700_000_000, dur, dist, n: 10, h: "0".repeat(64), ...(sim ? { sim } : {}) } as Attestation,
});

describe("summarise", () => {
  it("reports nothing for an empty log rather than throwing", () => {
    expect(summarise([])).toEqual({
      walks: 0, totalMetres: 0, totalSeconds: 0, simulated: 0, dogs: [],
    });
  });

  it("adds up the distance and time an owner is paying for", () => {
    const s = summarise([walk("Rufus", 1000, 1500), walk("Rufus", 800, 1200)]);
    expect(s.walks).toBe(2);
    expect(s.totalMetres).toBe(1800);
    expect(s.totalSeconds).toBe(2700);
  });

  it("lists each dog once, in the order first seen", () => {
    const s = summarise([walk("Rufus", 1, 1), walk("Bandit", 1, 1), walk("Rufus", 1, 1)]);
    expect(s.dogs).toEqual(["Rufus", "Bandit"]);
  });

  it("counts simulated walks separately, so demo walks never pad a real record", () => {
    const s = summarise([walk("Rufus", 1000, 100), walk("Rufus", 900, 90, 1)]);
    expect(s.walks).toBe(2);
    expect(s.simulated).toBe(1);
  });
});
