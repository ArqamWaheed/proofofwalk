# Durable project memory

Facts a future session should not have to rediscover. Not a task log.

## Why this project exists in this form

The repository is named `SecondChance` because it originally targeted a
different idea — a Snowflake Cortex study of shelter-dog adoption data. That
idea was abandoned at the platform gate, not for design reasons:

> **Snowflake trial accounts cannot run Cortex AI functions.** `AI_CLASSIFY`,
> `SUMMARIZE` and the rest all return *"AI function X is not available for trial
> accounts."* This is a blanket account-tier restriction, not a region or role
> problem, and no `GRANT` fixes it.

Do not re-attempt a Snowflake-Cortex direction on a trial account.

## The one contract that cannot change

`canonicalise()` in `src/lib/trace.ts` defines the exact byte sequence that gets
hashed and committed on chain. It is a wire format, not an implementation detail.

It deliberately does **not** use `JSON.stringify`: object key order is an
engine-level implementation detail, and betting hash reproducibility on it would
break verification silently and unfixably for records already on chain.

Coordinates are pinned to 5 decimal places (~1.1 m) for the same reason — GPS
reports far more precision than it possesses, and unpinned floats do not
reproduce across devices.

## Fee relaying: the walker signs, the server pays

The Memo instruction lists the **walker's** key as a signer; the relayer is only
the fee payer. Verified on live devnet: the memo's signer list contains the
walker's key and not the relayer's.

This split is the product's entire argument. It lets a walker with no wallet,
no SOL and no crypto knowledge produce a record that only their key could have
produced. If a future change makes the relayer the signer, the attestation stops
meaning anything and the project loses its reason to be on a chain at all.

`api/relay.ts` therefore validates before signing: exactly one instruction,
addressed to the Memo program, within 566 bytes, carrying a signer that is not
the relayer. Without those checks the endpoint is an open fee payer that anyone
can drain.

## Verification must not conflate "malformed" with "mismatch"

The verifier originally did `JSON.parse(file) as Trace`. Measured behaviour: of
four malformed traces, **three hashed successfully without error** (a fix missing
`t`, an empty `fixes` array, and a `NaN` latitude). Each produced a stable but
meaningless hash, which the UI reported as *"the file you were given is not the
route that was committed"* — an accusation of fraud caused by a broken file.

Fixed in `src/lib/schema.ts`. The distinction is a product requirement, not a
nicety: this app exists to tell those two situations apart.

The canonical-form test in `src/lib/__tests__/trace.test.ts` pins an exact
string. That is intentional: if it fails, the hashed bytes have changed and
every attestation already on chain has stopped verifying. Treat a failure there
as a design decision to make, never as a fixture to update.

## Dependency decisions

- **No schema library.** Boundary validation is hand-written guards in
  `src/lib/schema.ts`. Two small shapes did not justify the dependency. Revisit
  if validated shapes exceed ~4.
- **`buffer` polyfill is required.** `@solana/web3.js` v1 is a Node-era library
  that expects `Buffer` and `global`; `src/polyfills.ts` supplies both and must
  be imported before any web3.js import in `main.tsx`.
- **Vitest** is the test runner, chosen because the project is already Vite.

## Devnet operational facts

- Faucet airdrops via `connection.requestAirdrop` are IP rate-limited and
  reliably return 429 from this machine. The devnet RPC itself is healthy —
  do not mistake a throttled faucet for a broken cluster.
- The relayer keypair is funded manually through faucet.solana.com. A memo
  transaction costs ~0.000005 SOL, so 1 SOL is roughly 200,000 walks.
- `.relayer-key.json` holds the relayer secret locally and is gitignored. In
  production it is the `SOLANA_RELAYER_SECRET` environment variable.

## Known repository hazard

The first commit (`2265652`, pushed) contained four private strategy documents.
They were removed from tracking in the amended local commit, but **the pushed
commit on GitHub still contains them** unless a force push has since been run.
Verify `git log origin/main` before assuming the public repo is clean.
