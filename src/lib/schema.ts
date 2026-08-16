/**
 * Validation for everything this app did not produce itself.
 *
 * Two of the three inputs here arrive from the party the product exists to hold
 * accountable: the walker supplies the trace file, and anyone at all can write
 * bytes into a memo on a public chain. Casting those with `as Trace` was a real
 * bug — a fix missing its timestamp, an empty fix list, and a NaN latitude all
 * hashed without complaint, and the verifier reported the resulting garbage as
 * "this is not the route that was committed": a fraud accusation produced by a
 * malformed file.
 *
 * So parsing returns a result rather than throwing, and callers are forced to
 * tell the two outcomes apart.
 */

import type { Attestation } from "./attest";
import type { Fix, Trace } from "./trace";

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const fail = (error: string): Parsed<never> => ({ ok: false, error });

/** Rejects NaN and Infinity, which `typeof x === "number"` happily admits. */
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function parseFix(v: unknown, index: number): Parsed<Fix> {
  if (!isObject(v)) return fail(`fix ${index} is not an object`);
  if (!isFiniteNumber(v.t)) return fail(`fix ${index} has no finite timestamp \`t\``);
  if (!isFiniteNumber(v.lat)) return fail(`fix ${index} has no finite \`lat\``);
  if (!isFiniteNumber(v.lon)) return fail(`fix ${index} has no finite \`lon\``);
  if (v.lat < -90 || v.lat > 90) return fail(`fix ${index} has latitude ${v.lat}, outside -90..90`);
  if (v.lon < -180 || v.lon > 180) return fail(`fix ${index} has longitude ${v.lon}, outside -180..180`);
  return { ok: true, value: { t: v.t, lat: v.lat, lon: v.lon } };
}

export function parseTrace(input: unknown): Parsed<Trace> {
  if (!isObject(input)) return fail("that is not a JSON object");
  if (input.version !== 1) {
    return fail(`unsupported trace version ${String(input.version)} — this build reads version 1`);
  }
  if (typeof input.dog !== "string") return fail("`dog` must be a string");
  if (!Array.isArray(input.fixes)) return fail("`fixes` must be an array");

  // A walk needs at least two points to have happened at all. An empty trace
  // hashes to a perfectly stable value, which is exactly why it must be caught
  // here rather than silently compared.
  if (input.fixes.length < 2) {
    return fail(`a trace needs at least 2 fixes, this one has ${input.fixes.length}`);
  }

  const fixes: Fix[] = [];
  for (let i = 0; i < input.fixes.length; i++) {
    const parsed = parseFix(input.fixes[i], i);
    if (!parsed.ok) return parsed;
    fixes.push(parsed.value);
  }

  return { ok: true, value: { version: 1, dog: input.dog, fixes } };
}

export function parseTraceJson(text: string): Parsed<Trace> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("that file is not valid JSON");
  }
  return parseTrace(raw);
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * A memo is arbitrary public bytes. Anyone can write one that merely looks like
 * an attestation, so nothing here may be assumed — including that `h` is a hash
 * at all rather than a string chosen to make a comparison succeed.
 */
export function parseAttestation(input: unknown): Parsed<Attestation> {
  if (!isObject(input)) return fail("the memo is not a JSON object");
  if (input.v !== 1) {
    return fail(`unsupported attestation version ${String(input.v)} — this build reads version 1`);
  }
  if (typeof input.dog !== "string") return fail("memo `dog` must be a string");
  if (!isFiniteNumber(input.t0)) return fail("memo `t0` must be a number");
  if (!isFiniteNumber(input.dur)) return fail("memo `dur` must be a number");
  if (!isFiniteNumber(input.dist)) return fail("memo `dist` must be a number");
  if (!isFiniteNumber(input.n)) return fail("memo `n` must be a number");
  if (typeof input.h !== "string" || !SHA256_HEX.test(input.h)) {
    return fail("memo `h` is not a SHA-256 hex digest");
  }
  if (input.sim !== undefined && input.sim !== 1) return fail("memo `sim` must be 1 if present");

  const value: Attestation = {
    v: 1,
    dog: input.dog,
    t0: input.t0,
    dur: input.dur,
    dist: input.dist,
    n: input.n,
    h: input.h,
  };
  if (input.sim === 1) value.sim = 1;
  return { ok: true, value };
}

export function parseAttestationJson(text: string): Parsed<Attestation> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("this transaction's memo is not JSON, so it is not a walk attestation");
  }
  return parseAttestation(raw);
}
