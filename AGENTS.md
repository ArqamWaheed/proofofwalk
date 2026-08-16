# Engineering rules — Proof of Walk

Canonical repository-wide rules. `CLAUDE.md` points here; do not duplicate this
file's contents there.

## What this project is

A web app that records a dog walk on the walker's device, hashes the route, and
commits a compact attestation to Solana devnet as an SPL Memo signed by the
walker's key. An owner can later verify a trace file against that transaction.

## The rule that governs every other rule

**The walker is the adversarial party.** They supply the record and they benefit
from a favourable one. Any code that accepts input which could have come from a
walker — trace files, memo bytes, transaction signatures — is a trust boundary
and must validate rather than cast.

A consequence worth stating explicitly: the verifier must distinguish
*"this trace does not match"* from *"this input is malformed"*. Reporting a
parse failure as a mismatch accuses someone of fraud on the basis of a broken
file.

## Determinism

`canonicalise()` in `src/lib/trace.ts` defines the exact bytes that get hashed.
Its output format is a **wire contract**: an attestation committed today must
still verify years from now, on another machine, in another runtime.

- Never reorder, add, or reformat fields in `canonicalise()` without bumping
  `Trace.version` and keeping the old path readable.
- Never hash `JSON.stringify(object)` — key order is an implementation detail.
- Coordinates are pinned to 5 decimal places. GPS reports more precision than it
  has accuracy; unpinned floats make hashes irreproducible.

## Layering

| Layer | Location | May contain |
|---|---|---|
| Pure domain | `src/lib/trace.ts`, `src/lib/attest.ts`, `src/lib/simulate.ts` | Hashing, geometry, transaction construction. No React, no network, no DOM storage. |
| Boundary validation | `src/lib/schema.ts` | Parsing and validating untrusted input. Returns typed results; never throws for expected-bad input. |
| React state | `src/lib/useWalk.ts` | Geolocation lifecycle. |
| Views | `src/views/*` | Presentation and user flow. No hashing or transaction assembly. |
| Server | `api/*` | Fee relaying and key custody. Never returns a secret. |

`src/lib/trace.ts` must stay dependency-free and runnable in Node and the
browser — the tests and the e2e script both import it directly.

## TypeScript

- No `any`. No `@ts-ignore`.
- **No `as T` on parsed JSON.** `JSON.parse(x) as Trace` is the exact bug this
  codebase already shipped once. Use a validator from `src/lib/schema.ts`.
- Casts are acceptable only where a value's type is genuinely known to the
  compiler's blind spot and the cast is narrowing, not asserting.

## Validation approach

Boundary validation is hand-written type guards in `src/lib/schema.ts`, not a
schema library. Two small shapes did not justify a dependency (see `memory.md`).
If the number of validated shapes grows past ~4, revisit and adopt Zod.

## Secrets

- `SOLANA_RELAYER_SECRET` is the relayer's private key. It lives in the
  environment, never in the repo, and is never returned by an endpoint.
  `api/relayer.ts` derives and returns only the public key.
- `.relayer-key.json` is gitignored. It must stay that way.
- The walker's key is generated in the browser and stays in `localStorage`. It is
  a devnet key and deliberately disposable.

## The uuid override is load-bearing

`package.json` pins `overrides.rpc-websockets.uuid` to `^9.0.1`. Removing it
breaks production only — every local check still passes.

`@solana/web3.js` v1 depends on `rpc-websockets`, which ships both builds:

    "node": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" }

Left alone, npm installs `uuid@14`, which is ESM-only. The `.cjs` build calls
`require('uuid')` for `uuid.v1()`, so loading it from CommonJS throws
`ERR_REQUIRE_ESM` before the handler runs, and Vercel reports
`FUNCTION_INVOCATION_FAILED` rather than the endpoint's own error JSON.

Vercel compiles `api/*.ts` to CommonJS, so it always takes the `require` branch.
`uuid@9` ships CJS and still exports the `v1` that `rpc-websockets` calls.

**This cannot be reproduced or tested locally, at all.** Node 22.12+ supports
`require()` of an ES module, and this machine runs v22.19 — so the very call
that throws on Vercel succeeds here. A test asserting "web3.js loads under
CommonJS" therefore passes whether or not the override is present, which is
worse than no test. One was written, confirmed useless against a deliberately
broken tree, and deleted. The only real verification is a deploy.

Do not "fix" this by renaming the functions to `.mts`: Vercel's `api/`
directory does not recognise that extension and the deploy fails with
*the pattern "api/*.mts" ... doesn't match any Serverless Functions*.

## The relayer pays; it does not vouch

`api/relay.ts` co-signs to cover the fee. It must keep validating that it is
signing exactly one Memo instruction carrying a non-relayer signature. Without
that check it is an open fee payer anyone can drain, and the attestations it
produces would assert nothing about who walked.

## Tests

`npm test` (Vitest) must stay deterministic and offline. Network-touching checks
belong in `scripts/e2e.ts`, which is run by hand against devnet.

Priorities: hash determinism and the canonical form first, boundary validation
second, geometry third.

## Verification before commit

```
npm run lint && npm run build && npm test
```

## Commits

One coherent module per commit. Conventional prefixes (`feat:`, `fix:`,
`test:`, `docs:`, `chore:`).

**Every commit must land inside the DEV challenge window.** Anything committed
after 2026-08-17 06:59 UTC must be annotated in `README.md`, or the entry is
disqualified. Do not rewrite published history.
