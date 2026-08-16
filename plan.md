# Execution roadmap

**Deadline: 2026-08-17 06:59 UTC.** Everything below is scoped to fit inside it.

## Current milestone

**M3 — Hardening and tests.** In progress.

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

## In progress

### M3 — Hardening and tests
- [ ] Boundary validation for untrusted trace files and on-chain memos
      (`src/lib/schema.ts`), replacing the two `as` casts in `VerifyView`
- [ ] Verifier must report *malformed input* distinctly from *hash mismatch*
- [ ] Vitest suite: canonical-form stability, hash determinism, coordinate
      pinning, noise gate, memo size limit, validator accept/reject

## Pending

### M4 — Deploy
- [ ] `vercel.json` and Vercel project link **(needs the user's account)**
- [ ] `SOLANA_RELAYER_SECRET` set as a Vercel environment variable
- [ ] Live URL confirmed in a fresh incognito window, desktop and phone

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
- **Vercel deploy needs the user's account.** M4 cannot start without it.

## Immediate next actions

1. Land M3 (validation, then tests), committing each separately.
2. User: force push to scrub the strategy docs from the public repo.
3. User: link Vercel so M4 can proceed.

## Explicitly out of scope

Map tiles, accounts/login, mainnet, multi-walk history, notifications. Each was
considered and cut to protect the deadline; none is required by `README.md`.
