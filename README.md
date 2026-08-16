# Proof of Walk

**Your dog walker says they went. This makes the walk say so too.**

A walker opens this on their phone, taps start, and walks the dog. The route is
recorded on-device, hashed in the browser, and a compact attestation is committed
to the Solana devnet as an [SPL Memo](https://www.solana-program.com/docs/memo)
signed by the walker's own key.

The GPS trace never leaves the device. Only the hash goes on-chain. That is enough
for the owner to verify the trace they were shown is the trace that was committed —
and it means the walker cannot quietly produce a better walk after the fact.

**[Try it](https://proof-of-walk-jade.vercel.app)** — no wallet, no extension, no SOL. On a desktop with no GPS,
use *Run a simulated walk*; synthetic routes are flagged `sim: 1` on chain so they
stay distinguishable from real ones.

### Check my work

This attestation is on devnet now:

```
2q3GiHfvYBPyh8dNdYMWRTz6aPWQjjhAdJAm12g4UQ1CYAzZcNZNVAgDHJE4FmLUNVN1Qw7fzVgmgAUoSAHFhYST
```

The trace behind it is `docs/example-walk.json`. Paste the signature, load the
file, and the Verify tab says **Match**. Change one digit of one coordinate —
about 11 metres, the smallest edit the 5dp pinning can represent — and it says
**No match**, with both hashes drawn side by side.

Built for the [DEV Weekend Challenge: Dog Days Edition](https://dev.to/challenges/weekend-2026-08-13).

## Why a blockchain, honestly

Most of this could be a database row. One part could not: the walker is the
adversarial party, and they are the one supplying the record. A row in a server
they can reach is a row they can edit. An SPL Memo signed by their key, in a block
with a timestamp neither of you control, is not.

That is the whole claim. This project does not tokenise anything, mint anything,
or ask anyone to hold a coin.

## What it does not prove

That a device recorded a route. Not that a dog was on the end of the leash, and
not that the walker was holding the phone. Anyone can leave a phone in a car that
drives the route. This narrows the gap between "trust me" and "verifiable"; it
does not close it.

## Licence

Apache-2.0. See `LICENSE`.
