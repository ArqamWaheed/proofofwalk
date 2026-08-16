# Execution roadmap

**Deadline: 2026-08-17 06:59 UTC.** Everything below is scoped to fit inside it.

## Current milestone

**M4 — Deploy.** Blocked on the user's Vercel account.

## Completed

### M1 — Attestation spine ✅
- Deterministic trace canonicalisation and SHA-256 hashing (`src/lib/trace.ts`)
- SPL Memo attestation construction (`src/lib/attest.ts`)
- Fee-relayer endpoints with instruction validation (`api/relay.ts`, `api/relayer.ts`)
- Verified end-to-end on live devnet: walker is the sole memo signer, hash
  reproduces on read-back, tampered trace rejected (`scripts/e2e.ts`)

### M2 — Application ✅
- Walk recorder with geolocation lifecycle (`src/lib/useWalk.ts`)
- Simulated walk for desktop evaluation, flagged `sim: 1` on chain
- Route sketch rendered from fixes, no basemap (`src/components/RouteSketch.tsx`)
- Walk and Verify views, dark responsive styling
- Clean `tsc -b && vite build`

### M3 — Hardening and tests ✅
- Boundary validation for untrusted trace files and on-chain memos
  (`src/lib/schema.ts`), replacing both `as` casts in `VerifyView`
- Verifier reports malformed input, an unrelated memo, and a missing
  transaction as distinct outcomes from a genuine hash mismatch
- Relay payload bounded before decoding
- Vitest: 54 offline tests across canonical form, hashing, geometry,
  validation, and the walker-signs/relayer-pays split

## In progress

### M4 — Deploy
- [x] `vercel.json` and `.env.example`
- [ ] Vercel project link **(needs the user's account)**
- [ ] `SOLANA_RELAYER_SECRET` set as a Vercel environment variable
- [ ] Live URL confirmed in a fresh incognito window, desktop and phone

## Pending

### M5 — Submission
- [ ] 60–75s screen recording, unlisted YouTube
- [ ] Cover image, 1000×420
- [ ] DEV post using the official template verbatim, all five required sections
- [ ] Tags: `devchallenge`, `weekendchallenge` + 2 free
- [ ] Publish with ≥4h margin before 06:59 UTC

## Blockers

- **Public repo still exposes private strategy docs.** Commit `2265652` on
  `origin/main` contains them. Requires `git push -f origin main`, which the
  agent is not permitted to run (see `AGENTS.md`, and §22 of the operating
  protocol). **User action.**
- **Vercel deploy needs the user's account.** Config is committed; the link
  and the environment variable are the remaining steps.

## Immediate next actions

1. **User:** force push to scrub the strategy docs from the public repo.
2. **User:** link Vercel, then set `SOLANA_RELAYER_SECRET`, so M4 can finish.
3. Once deployed: browser pass on desktop and phone, then M5.

## Explicitly out of scope

Map tiles, accounts/login, mainnet, multi-walk history, notifications. Each was
considered and cut to protect the deadline; none is required by `README.md`.
