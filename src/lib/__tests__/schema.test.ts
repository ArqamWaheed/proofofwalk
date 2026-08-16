import { describe, expect, it } from "vitest";
import { parseAttestation, parseTrace, parseTraceJson } from "../schema";

const goodFixes = [
  { t: 1000, lat: 30.2669, lon: -97.7729 },
  { t: 1015, lat: 30.267, lon: -97.773 },
];
const goodTrace = { version: 1, dog: "Rufus", fixes: goodFixes };

const goodAttestation = {
  v: 1, dog: "Rufus", t0: 1000, dur: 15, dist: 120, n: 2,
  h: "0".repeat(64),
};

describe("parseTrace", () => {
  it("accepts a well-formed trace", () => {
    const r = parseTrace(goodTrace);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.fixes).toHaveLength(2);
  });

  it("strips unknown fields rather than carrying them into the hash", () => {
    const r = parseTrace({ ...goodTrace, injected: "surprise" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).not.toHaveProperty("injected");
  });

  // These four all hashed silently before validation existed, and the verifier
  // reported the result as a mismatch — accusing the walker of swapping the
  // route when the file was simply broken.
  it.each([
    ["a fix missing its timestamp", { version: 1, dog: "R", fixes: [{ lat: 30.2, lon: -97.7 }, { lat: 30.3, lon: -97.8 }] }],
    ["an empty fix list", { version: 1, dog: "R", fixes: [] }],
    ["a NaN latitude", { version: 1, dog: "R", fixes: [{ t: 1, lat: NaN, lon: -97.7 }, { t: 2, lat: 30.3, lon: -97.8 }] }],
    ["a stringly-typed latitude", { version: 1, dog: "R", fixes: [{ t: 1, lat: "30.2", lon: -97.7 }, { t: 2, lat: 30.3, lon: -97.8 }] }],
  ])("rejects %s", (_label, input) => {
    expect(parseTrace(input).ok).toBe(false);
  });

  it("rejects a single-fix trace, which is not a walk", () => {
    expect(parseTrace({ version: 1, dog: "R", fixes: [goodFixes[0]] }).ok).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    const r = parseTrace({ version: 1, dog: "R", fixes: [{ t: 1, lat: 91, lon: 0 }, goodFixes[1]] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("-90..90");
  });

  it("rejects an unsupported version rather than guessing at the format", () => {
    expect(parseTrace({ ...goodTrace, version: 2 }).ok).toBe(false);
  });

  it.each([null, undefined, 42, "a string", [goodTrace]])("rejects %s", (input) => {
    expect(parseTrace(input).ok).toBe(false);
  });
});

describe("parseTraceJson", () => {
  it("round-trips a serialised trace", () => {
    expect(parseTraceJson(JSON.stringify(goodTrace)).ok).toBe(true);
  });

  it("reports invalid JSON as invalid JSON", () => {
    const r = parseTraceJson("{not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("not valid JSON");
  });
});

describe("parseAttestation", () => {
  it("accepts a well-formed attestation", () => {
    expect(parseAttestation(goodAttestation).ok).toBe(true);
  });

  it("keeps the simulated flag", () => {
    const r = parseAttestation({ ...goodAttestation, sim: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.sim).toBe(1);
  });

  it("omits the simulated flag when absent, rather than defaulting it", () => {
    const r = parseAttestation(goodAttestation);
    if (r.ok) expect(r.value.sim).toBeUndefined();
  });

  // A memo is public bytes: anyone can write something shaped like this.
  it.each([
    ["a non-hex digest", { ...goodAttestation, h: "not-a-hash" }],
    ["a truncated digest", { ...goodAttestation, h: "abc123" }],
    ["an uppercase digest", { ...goodAttestation, h: "A".repeat(64) }],
    ["a missing digest", { ...goodAttestation, h: undefined }],
    ["a numeric dog", { ...goodAttestation, dog: 7 }],
    ["a non-numeric distance", { ...goodAttestation, dist: "far" }],
    ["a bogus sim flag", { ...goodAttestation, sim: 2 }],
    ["an unsupported version", { ...goodAttestation, v: 9 }],
  ])("rejects %s", (_label, input) => {
    expect(parseAttestation(input).ok).toBe(false);
  });
});
