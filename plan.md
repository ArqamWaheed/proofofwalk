# Execution roadmap

**Deadline: 2026-08-17 06:59 UTC.** Everything below is scoped to fit inside it.

## Current milestone

**M4 — Deploy.** Blocked on the user's Vercel account, and on the repo being
published at all — see Blockers.

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

### M3.5 — UI redesign ✅
- "Dusk and seal" direction: twilight indigo ground, `--ember` for a claim being
  recorded and `--seal` for a fact settled on chain (`src/index.css`)
- `src/components/Seal.tsx` draws a SHA-256 as 32 bars so two hashes can be
  compared by eye; it decides nothing, the verdict is still the string compare
- Fixed: the dog name input was editable after finishing, so a walker could
  finish, rename, download, and hand over a trace whose hash no longer matched
- Raised `--chalk-faint` to #8386ac; the previous value failed AA at 3.96:1

## In progress

### M4 — Deploy
- [x] `vercel.json` and `.env.example`
- [ ] Vercel project link **(needs the user's account)**
- [ ] `SOLANA_RELAYER_SECRET` set as a Vercel environment variable
- [ ] Live URL confirmed in a fresh incognito window, desktop and phone

## Pending

### M5 — Submission
- [ ] 60–75s screen recording, unlisted YouTube
- [x] Cover image, 1000×420 (`docs/cover.png`, source `docs/cover.html`)
- [ ] DEV post using the official template verbatim, all five required sections
- [ ] Tags: `devchallenge`, `weekendchallenge` — exactly the pair the official
      prefill sets. An earlier note here said "+ 2 free"; the challenge page
      requires only `#weekendchallenge` and suggests no others. Do not add more.
- [ ] Publish with ≥4h margin before 06:59 UTC

## Blockers

- **Nothing has been published, and what is published leaks.** Measured
  2026-08-16 13:20 UTC: `origin/main` is a *single* commit (`2265652`, the
  original bootstrap) whose tree still contains all four `0N-` strategy
  documents. The nine commits of real work exist only on the local machine, and
  the two histories share no common ancestor because the root was amended. A
  judge visiting the repo today sees the strategy docs and none of the project.
  Fixing this needs `git push -f origin main`, which the agent is not permitted
  to run (see `AGENTS.md`). **User action, and the highest priority item here.**
- ~~A force push does not fully scrub GitHub.~~ **Settled 2026-08-16: accepted,
  not a blocker.** The force push landed; `origin/main` is clean and carries all
  eleven commits. Commit `2265652` survives as an orphan and still serves the
  four `0N-` documents, and the repo's Activity tab links it publicly
  (`force pushed to main • 2265652…0e5d1a7`), so it is browsable rather than
  SHA-only. The user reviewed both facts and decided this is acceptable: what
  matters is that the *current* tree is clean. Do not re-raise this, and do not
  delete/recreate the repository.
- **Vercel deploy needs the user's account.** Config is committed; the link
  and the environment variable are the remaining steps.

## Immediate next actions

1. ~~Force push.~~ **Done 2026-08-16 ~19:30 UTC.** Eleven commits published,
   local and remote in sync, no secrets or `0N-` documents in the tree.
2. **User:** link Vercel, then set `SOLANA_RELAYER_SECRET`, so M4 can finish.
3. Once deployed: browser pass on desktop and phone, and exercise the verifier's
   match/mismatch cards against a real devnet transaction — those two states
   have never been seen with live data, because `/api/*` does not run under
   `vite dev`.
4. Then M5: DEV post draft and the screen recording.

## Explicitly out of scope

Map tiles, accounts/login, mainnet, multi-walk history, notifications. Each was
considered and cut to protect the deadline; none is required by `README.md`.
