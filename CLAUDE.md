# Claude Code — entry point

## Read first

1. **`AGENTS.md`** — the canonical engineering rules. Read it before writing code.
2. **`plan.md`** — current milestone and next actions.
3. **`memory.md`** — decisions and constraints you should not have to rediscover.
4. **`README.md`** — what the product is and what it deliberately does not claim.

There is **no separate PRD**. Product behaviour is defined by `README.md` plus
`plan.md`. Do not invent requirements that neither states.

## Deadline context

This repository is an entry in the DEV Weekend Challenge: Dog Days Edition.

- **Submissions close 2026-08-17 06:59 UTC.** Check the clock before planning work.
- Commit history is judged. Commits must fall inside the challenge window; work
  landing after the deadline must be annotated in `README.md`.
- The repository is **public**. Assume anything committed is read by a judge.

## Working here

- Verify with `npm run lint && npm run build && npm test` before every commit.
- `scripts/e2e.ts` hits **live devnet** and needs `.relayer-key.json` plus a
  funded relayer. Do not wire it into `npm test`.
- Devnet faucet airdrops are IP rate-limited and usually fail from this machine.
  The relayer is funded manually via faucet.solana.com; check its balance rather
  than assuming an airdrop will work.

## Boundaries you must not cross without asking

- Do not change `canonicalise()` in `src/lib/trace.ts`. It defines the hashed
  bytes; changing it silently invalidates every attestation already committed.
- Do not remove the instruction validation in `api/relay.mts`.
- Do not commit `.relayer-key.json` or any `.env` file.
- Do not force push or rewrite published history.

## Local strategy notes

`00-`…`03-` markdown files in the working tree are private research and are
gitignored. They are not project documentation and must never be committed.
