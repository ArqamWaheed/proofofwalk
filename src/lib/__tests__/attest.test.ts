import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import {
  buildAttestation, buildWalkTransaction, encodeMemo, MEMO_MAX_BYTES, MEMO_PROGRAM_ID,
} from "../attest";
import { simulateWalk } from "../simulate";
import type { Trace } from "../trace";

const trace: Trace = {
  version: 1,
  dog: "Rufus",
  fixes: [
    { t: 1000, lat: 30.2669, lon: -97.7729 },
    { t: 1015, lat: 30.267, lon: -97.773 },
  ],
};

describe("buildAttestation", () => {
  it("summarises the walk without carrying the route", async () => {
    const a = await buildAttestation(trace);
    expect(a).toMatchObject({ v: 1, dog: "Rufus", t0: 1000, dur: 15, n: 2 });
    expect(a.h).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(a)).not.toContain("30.2669");
  });

  it("omits the simulated flag for a real walk", async () => {
    expect((await buildAttestation(trace)).sim).toBeUndefined();
  });

  it("marks a simulated walk so the chain records the distinction", async () => {
    expect((await buildAttestation(trace, { simulated: true })).sim).toBe(1);
  });
});

describe("encodeMemo", () => {
  it("fits the SPL Memo budget for a realistic walk", async () => {
    const a = await buildAttestation({ version: 1, dog: "Rufus", fixes: simulateWalk() });
    expect(new TextEncoder().encode(encodeMemo(a)).length).toBeLessThan(MEMO_MAX_BYTES);
  });

  it("refuses to truncate a record that overruns the budget", async () => {
    const a = await buildAttestation({ ...trace, dog: "R".repeat(600) });
    expect(() => encodeMemo(a)).toThrow(/566-byte limit/);
  });

  it("counts bytes rather than characters", async () => {
    // Multi-byte names must not sneak past a length check on the string.
    const a = await buildAttestation({ ...trace, dog: "🐕".repeat(200) });
    expect(() => encodeMemo(a)).toThrow(/566-byte limit/);
  });
});

describe("buildWalkTransaction", () => {
  const walker = Keypair.generate();
  const relayer = Keypair.generate();
  const blockhash = "11111111111111111111111111111111";

  it("addresses the SPL Memo program", () => {
    const tx = buildWalkTransaction(walker.publicKey, relayer.publicKey, "{}", blockhash);
    expect(tx.instructions).toHaveLength(1);
    expect(tx.instructions[0].programId.equals(MEMO_PROGRAM_ID)).toBe(true);
  });

  it("makes the relayer pay", () => {
    const tx = buildWalkTransaction(walker.publicKey, relayer.publicKey, "{}", blockhash);
    expect(tx.feePayer?.equals(relayer.publicKey)).toBe(true);
  });

  // The property the whole design rests on: the record is the walker's
  // assertion, not the server's.
  it("makes the walker the memo's signer, and not the relayer", () => {
    const tx = buildWalkTransaction(walker.publicKey, relayer.publicKey, "{}", blockhash);
    const signers = tx.instructions[0].keys.filter((k) => k.isSigner).map((k) => k.pubkey);
    expect(signers.map((s) => s.toBase58())).toEqual([walker.publicKey.toBase58()]);
    expect(signers.some((s) => s.equals(relayer.publicKey))).toBe(false);
  });

  it("carries the memo through unmodified", () => {
    const memo = '{"v":1,"dog":"Rufus"}';
    const tx = buildWalkTransaction(walker.publicKey, relayer.publicKey, memo, blockhash);
    expect(new TextDecoder().decode(tx.instructions[0].data)).toBe(memo);
  });
});

describe("simulateWalk", () => {
  it("produces a trace long enough to be a walk", () => {
    const fixes = simulateWalk();
    expect(fixes.length).toBeGreaterThan(50);
    expect(fixes.at(-1)!.t).toBeGreaterThan(fixes[0].t);
  });

  it("is reproducible for a fixed start time", async () => {
    const a: Trace = { version: 1, dog: "R", fixes: simulateWalk({ startedAt: 1000 }) };
    const b: Trace = { version: 1, dog: "R", fixes: simulateWalk({ startedAt: 1000 }) };
    const { hashTrace } = await import("../trace");
    expect(await hashTrace(a)).toBe(await hashTrace(b));
  });
});
