---
title: "Proof of Walk: your dog walker says they went. This makes the walk say so too."
published: false
tags: devchallenge, weekendchallenge
cover_image: <<UPLOAD docs/cover.png TO THE DEV EDITOR AND PASTE THE URL HERE>>
---

*This is a submission for [Weekend Challenge: Dog Days Edition](https://dev.to/challenges/weekend-2026-08-13)*

## What I Built

Paying someone to walk your dog is an unusual transaction: the person you are
checking up on is the same person writing the report. They were there and you
weren't, they supply the record, and a better-looking record is worth more to
them than an honest one.

**Proof of Walk** narrows that gap. A walker opens it on their phone, taps
start, and walks the dog. The route is recorded on-device, hashed in the
browser, and a compact attestation is committed to the Solana devnet as an
[SPL Memo](https://www.solana-program.com/docs/memo) signed by the walker's own
key. Later, the owner drops the trace file and the transaction signature into a
Verify tab, and the app recomputes the hash locally and compares.

The GPS trace never leaves the device — only its SHA-256 goes on chain. That is
enough to prove the trace you were shown is the trace that was committed, and it
means the walker cannot quietly produce a better walk after the fact.

### What it does not prove

It proves a device recorded a route. Not that a dog was on the end of the leash,
and not that the walker was holding the phone. Anyone can leave a phone in a car
that drives the route.

I'd rather state that plainly than let the word "blockchain" imply more than the
system earns. This narrows the distance between "trust me" and "verifiable"; it
does not close it.

## Demo

**Live app:** https://proof-of-walk-jade.vercel.app

**Walkthrough video:** <<PASTE UNLISTED YOUTUBE URL>>

### Verify it yourself, in two clicks

**[Open a committed walk, ready to check](https://proof-of-walk-jade.vercel.app/?tx=2q3GiHfvYBPyh8dNdYMWRTz6aPWQjjhAdJAm12g4UQ1CYAzZcNZNVAgDHJE4FmLUNVN1Qw7fzVgmgAUoSAHFhYST)**

The link opens the verifier with a real devnet signature filled in. *Load the
example walk* → *Verify* → **Match**. Then *Now edit one coordinate* → *Verify*
→ **No match**, with both hashes drawn as bars so you can see them diverge.

This attestation is on devnet right now:

```
2q3GiHfvYBPyh8dNdYMWRTz6aPWQjjhAdJAm12g4UQ1CYAzZcNZNVAgDHJE4FmLUNVN1Qw7fzVgmgAUoSAHFhYST
```

The trace it was made from is committed at [`docs/example-walk.json`](https://github.com/ArqamWaheed/SecondChance/blob/main/docs/example-walk.json).
Open the Verify tab, paste that signature, load that file, and you get **Match**.

Then change a single digit of a single coordinate and verify again. One fix moved
about 11 metres — the smallest edit the 5-decimal-place pinning can even
represent — and the hash goes from

```
bcea241329168f0925120da1661ef74518abedd038ac481620c471a0e4d23fef
```
to
```
e5e28492bb238302d9e95ee36657b251063efaa3ceff723cf31ea1f62edc5d69
```

which the app shows you as two visibly different seals, side by side.

No wallet, no extension, and no SOL are required to try it. Open it on a phone
and take a real walk, or use **Run a simulated walk** on a desktop with no GPS —
simulated routes are flagged `sim: 1` in the attestation itself, so a demo walk
stays distinguishable from a real one on a public chain without anyone having to
take my word for it.

## Code

{% embed https://github.com/ArqamWaheed/SecondChance %}

## How I Built It

React + Vite on the front end, `@solana/web3.js` for transaction construction,
and two Vercel serverless functions. The parts worth talking about are the
decisions, not the stack.

### Why a blockchain, honestly

Most of this could be a database row. One part could not: the walker is the
adversarial party, and they are the one supplying the record. A row in a server
they can reach is a row they can edit. An SPL Memo signed by their key, in a
block with a timestamp neither of us controls, is not.

That is the whole claim. This project doesn't tokenise anything, mint anything,
or ask anyone to hold a coin.

### The hashed bytes are a wire contract

An attestation committed today has to still verify years from now, on another
machine, in another runtime. So the serialisation that gets hashed is pinned
deliberately, and `JSON.stringify` is banned from that path — object key order is
an engine-level implementation detail, and betting hash reproducibility on it
would break verification silently for records already on chain.

```ts
/**
 * Canonical form. Not JSON.stringify(trace) — key order in an object literal is
 * an implementation detail we would be betting the whole verification on.
 * This writes the fields positionally, in an order fixed by this function.
 */
export function canonicalise(trace: Trace): string {
  const rows = trace.fixes.map((f) => `${f.t},${f.lat.toFixed(5)},${f.lon.toFixed(5)}`);
  return [`v${trace.version}`, trace.dog, ...rows].join("\n");
}
```

Coordinates are pinned to five decimal places (~1.1 m) for the same reason. GPS
reports far more precision than it actually possesses, and unpinned floats don't
reproduce across devices. A test pins the canonical form to an exact string: if
it ever fails, the hashed bytes have changed and every attestation already on
chain has stopped verifying. That's a design decision to make, never a fixture
to quietly update.

### The walker signs; the server pays

This is the part I'm happiest with. A dog walker has no wallet, no SOL, and no
reason to learn what either is — but the record is worthless if it's the
*server* asserting the walk happened.

So the two roles are split. The Memo instruction lists the **walker's** key as a
signer, while a relayer key pays the fee. The Memo program logs verified signers,
so what lands on chain is "this key asserted this walk," funded by a key the
walker never holds.

That makes the relayer an endpoint that spends money on request, so it verifies
what it's signing instead of trusting the client:

```ts
function assertIsWalkAttestation(tx: Transaction, relayer: PublicKey): void {
  if (tx.instructions.length !== 1) { /* ... */ }
  const [ix] = tx.instructions;
  if (!ix.programId.equals(MEMO_PROGRAM_ID)) { /* ... */ }
  if (ix.data.length > MEMO_MAX_BYTES) { /* ... */ }
  if (!tx.feePayer?.equals(relayer)) { /* ... */ }

  // The whole value of the record is that a walker key vouched for it. A memo
  // signed only by the relayer asserts nothing about who took the walk.
  const walkerSigned = ix.keys.some((k) => k.isSigner && !k.pubkey.equals(relayer));
  if (!walkerSigned) throw new Error("no walker signature on the memo instruction");
}
```

Without those checks it's a faucet with extra steps — anyone could drain it by
feeding it transfers to their own account. A memo transaction costs about
0.000005 SOL, so one devnet SOL covers roughly 200,000 walks.

### Telling "this is broken" apart from "this is a lie"

This is the bug I shipped and then had to fix, and it's the one I'd want a
reviewer to look at.

The verifier originally did `JSON.parse(file) as Trace`. A TypeScript cast is a
promise to the compiler, not a check at runtime, so malformed input sailed
straight through. I tested four broken traces: **three of them hashed
successfully** — a fix missing its timestamp, an empty `fixes` array, and a `NaN`
latitude. Each produced a stable, confident, meaningless hash.

Which the UI then reported as: *the route you were given is not the route that
was committed.*

That's an accusation of fraud caused by a corrupted file. For an app whose entire
purpose is adjudicating trust between two people, that's not a rough edge — it's
the app doing the opposite of its job. The fix was hand-written type guards at
the boundary, and the verifier now reports five distinct outcomes: a match, a
genuine mismatch, an unreadable trace, a transaction that isn't a walk
attestation at all, and no such transaction. Only one of those is an accusation,
and the UI colours it accordingly — a malformed file gets a neutral card, never a
red one.

### The gap I found late: a hash has no opinion about *when*

The SHA-256 proves *which* route was recorded. It says nothing about when — and
that leaves a gap an adversarial walker can stand in. Record one genuinely
excellent walk. Keep the trace. Commit it again next Tuesday. The hash matches
perfectly, because it really is that walk. Just not this week's.

The fix falls out of what a blockchain actually gives you. The block timestamp
is the one clock in the system the walker doesn't control, so the verifier now
compares it against the trace's own end time:

```ts
const walkEnded = attestation.t0 + attestation.dur;
const delaySeconds = blockTime - walkEnded;
```

The example walk reports *"Committed 28 seconds after the walk ended — while it
was still fresh."* A trace committed six days after it was recorded says so, and
a block written **before** the walk could have ended is called out separately as
either clock skew or a fabricated timestamp.

It reports a fact, not a verdict. A long delay has innocent explanations — no
signal until the walker got home, a relay that retried later. The interface
states the gap and lets the owner decide, because "this took a while" and "you
are lying to me" are not the same sentence, and this project's whole discipline
is refusing to collapse the two.

Worth noting this is the second time that discipline changed the design. The
first was malformed-versus-mismatch; this is replay-versus-delay. Both are the
same mistake in different clothes: letting the system imply an accusation it
cannot actually support.

### No map tiles, on purpose

The route is drawn from the fixes themselves as a bare polyline on graph paper.
A basemap would render the walker's actual neighbourhood on screen — and their
home is usually at one end of the line. The shape of the walk is the only part
anyone needs to see.

### Design

I gave it a deliberate visual direction rather than default dark-mode: a twilight
indigo ground, with warm amber meaning *a claim being recorded* and cool cyan
meaning *a fact settled on chain*. Committing is literally the moment the screen
turns from amber to cyan.

The piece I like most is the seal — a SHA-256 drawn as 32 bars, one per byte.
Nobody reads a 64-character hex string, which is a problem for a screen whose
whole job is comparing two of them. On a mismatch you get both skylines stacked
and visibly different. It's a reading aid, not the check: the verdict is still
the string comparison in code, and the full hex stays on screen next to it.

### Testing

54 offline tests, prioritised in the order things would hurt if they broke: hash
determinism and the canonical form first, boundary validation second, geometry
third. Anything that touches the network lives in a separate script run by hand
against devnet, so `npm test` stays deterministic and offline.

## Prize Categories

**Best Use of Solana.**

Solana is load-bearing here rather than decorative. The project uses SPL Memo for
the attestation payload, and the walker-signs/relayer-pays split is the reason
the whole thing works for someone with no wallet and no crypto literacy. If a
future change made the relayer the signer, the attestation would stop meaning
anything and the project would lose its reason to be on a chain at all.
