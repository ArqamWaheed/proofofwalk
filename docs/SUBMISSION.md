---
title: "Your dog walker says they went. This makes the walk say so too."
published: false
tags: devchallenge, weekendchallenge
cover_image: <<UPLOAD docs/cover@2x.png TO THE DEV EDITOR AND PASTE THE URL HERE>>
---

*This is a submission for [Weekend Challenge: Dog Days Edition](https://dev.to/challenges/weekend-2026-08-13)*

> **TL;DR** — A walker records the walk on their phone, the route is hashed in the browser, and a 147-byte attestation signed by the walker's own key lands on Solana devnet. The owner checks the trace they were handed against the chain, and the app tells a tampered route apart from a corrupted file. Move one GPS fix eleven metres and the hash changes completely. That's the whole product.

---

## What I Built

My first idea for this challenge died on Friday night. I'd planned a Snowflake Cortex study of shelter-dog adoption data, wrote the queries, and got the same reply from every single AI function: *AI function AI_CLASSIFY is not available for trial accounts.* Not a region problem. Not a role problem. A blanket account-tier restriction that no `GRANT` fixes. I lost the whole idea in one evening, and the repo carried the name `SecondChance` right up until I shipped this.

So I went looking for a dog problem I could actually finish in a weekend, and picked the one that is genuinely about trust: paying someone else to walk your dog.

It's a strange transaction. The person you're checking up on is the same person writing the report. They were there, you weren't, and a better-looking report is worth more to them than an honest one.

The villain here is **the record being supplied by the party it judges**.

**So I stopped asking the walker to be trustworthy. I made the walk testify.**

**Proof of Walk** records the route on the walker's phone, hashes it in the browser, and commits a compact attestation to Solana devnet as an [SPL Memo](https://www.solana-program.com/docs/memo) signed by the walker's own key. The GPS trace never leaves the device. Only its SHA-256 goes on chain. Later the owner drops the trace file and the transaction signature into a Verify tab, the hash is recomputed locally, and the two are compared.

That's enough to prove the trace you were shown is the trace that was committed. It also means the walker can't quietly produce a better walk afterwards.

What it does not prove: that a dog was on the end of the leash. It proves a device recorded a route. Anyone can leave a phone in a car that drives the block. This narrows the distance between "trust me" and "check it". It doesn't close it, and I'd rather write that down than let the word "blockchain" imply more than the thing earns.

[IMAGE PLACEHOLDER 1: Before/after split panel, 16:9 landscape, 1536x1024. Style: flat twilight-indigo #0E1020 background with a faint 40px graph-paper grid in #2E3358 at low opacity, chalk white #ECEAF6 text, amber #FFA046 for a claim being recorded, cyan #6FE3E8 for a fact settled on chain, rose #FF7A8F for a mismatch, bold grotesque display type, JetBrains Mono for all data and labels. Absolutely no gradients, glows or neon bloom. Two panels divided by a thin #2E3358 vertical rule. Left panel header chip in amber reading "WHAT YOU GET TODAY" with subtitle "A text message and good faith."; inside, a phone message bubble reading "took Rufus out, did 2km 👍" and below it three red handwritten annotations with curved arrows: "no route", "no time", "editable forever". Right panel header chip in cyan reading "WHAT THIS COMMITS" with subtitle "A record the walker cannot revise."; inside, a clean card showing a monospace block "dog: Rufus / dist: 1000 m / dur: 24:45 / h: bcea2413…" and beneath it a row of 32 cyan vertical bars of varying height. Bottom edge, small monospace centred: "Solana devnet · SPL Memo · signed by the walker's key".]

*The gap the project is actually closing. A message is a claim. An attestation is a claim you can test.*

---

## Demo

**Live app:** [proof-of-walk-jade.vercel.app](https://proof-of-walk-jade.vercel.app)

No wallet, no extension, no SOL. On a desktop with no GPS, *Run a simulated walk* produces a synthetic route and flags it `sim: 1` in the attestation itself, so a demo walk stays distinguishable from a real one on a public chain without anyone taking my word for it.

You don't have to record anything to check that the thing works. This link opens the verifier with a real devnet signature already filled in:

**[Open a committed walk, ready to check](https://proof-of-walk-jade.vercel.app/?tx=2q3GiHfvYBPyh8dNdYMWRTz6aPWQjjhAdJAm12g4UQ1CYAzZcNZNVAgDHJE4FmLUNVN1Qw7fzVgmgAUoSAHFhYST)**

Press *Load the example walk*, then *Verify*. It says **Match**.

Then press *Now edit one coordinate*. That moves a single GPS fix by 0.0001 degrees, about 11 metres, the smallest change the format can express. Verify again and it says **No match**, with both hashes drawn as bars so the difference is something you see rather than something I assert.

Being able to falsify the claim in two clicks is a better argument than any paragraph I could write here.

[IMAGE PLACEHOLDER 2: REAL SCREENSHOT, NOT GENERATED — capture from the live app at https://proof-of-walk-jade.vercel.app. Load the example walk, verify it, then press "Now edit one coordinate" and verify again. Capture the full "No match" verdict card at 1440px wide, showing the heading "No match", the explanatory paragraph, and both seal strips: the cyan "ON CHAIN" strip with hash bcea241329168f0925120da1661ef74518abedd038ac481620c471a0e4d23fef above the rose "THIS FILE" strip with hash e5e28492bb238302d9e95ee36657b251063efaa3ceff723cf31ea1f62edc5d69.]

*Eleven metres, drawn. Nobody reads a 64-character hex string, so the app renders each hash as 32 bars, one per byte.*

**Walkthrough video:** <<UPLOAD THE DEMO MP4 TO YOUTUBE AS UNLISTED, THEN PASTE THE URL HERE>>

A 65-second run through the whole thing: load a committed walk, verify it, break it by one coordinate, watch the hashes diverge, then read the walker's full record off the chain. The narration is Piper, an offline neural TTS, rather than my own voice.

Running it locally is three commands:

```bash
git clone https://github.com/ArqamWaheed/proofofwalk
npm install
npm run dev
```

---

## Code

{% embed https://github.com/ArqamWaheed/proofofwalk %}

Interesting files, if you only open a few:

* `src/lib/trace.ts`: the canonical form. The bytes that get hashed, and the only file the offline verifier shares with the website.
* `api/relay.ts`: the fee relayer, and the four checks that stop it being a faucet.
* `src/lib/schema.ts`: hand-written validation for everything the walker supplies.
* `src/lib/freshness.ts`: the replay gap, and how a block timestamp closes it.
* `scripts/verify.ts`: the same verification with no website involved.

The one contract that can never change is the serialisation, so it's deliberately boring:

```ts
export function canonicalise(trace: Trace): string {
  const rows = trace.fixes.map((f) => `${f.t},${f.lat.toFixed(5)},${f.lon.toFixed(5)}`);
  return [`v${trace.version}`, trace.dog, ...rows].join("\n");
}
```

`JSON.stringify` is banned from that path. Key order in an object literal is an engine-level implementation detail, and betting hash reproducibility on it would break verification silently for records already committed. Coordinates are pinned to five decimal places, about 1.1 metres, for the same reason. GPS reports far more precision than it actually has, and unpinned floats don't reproduce across devices.

A test pins the output of that function to an exact string. If it ever fails, the hashed bytes have changed and every attestation already on chain has stopped verifying. That's a design decision to make, never a fixture to update.

---

## How I Built It

React and Vite on the front end, `@solana/web3.js` for transaction construction, two Vercel serverless functions. The stack isn't the interesting part. The decisions are.

**Why a chain at all, honestly.** Most of this could be a database row. One part could not. The walker is the adversarial party and they're the one supplying the record, so a row in a server they can reach is a row they can edit. An SPL Memo signed by their key, in a block with a timestamp neither of us controls, is not. That's the whole bet. This project doesn't tokenise anything, mint anything, or ask anyone to hold a coin.

**The walker signs, the server pays.** A dog walker has no wallet, no SOL, and no reason to learn what either is. But the record is worthless if it's the *server* asserting the walk happened. So the two roles split: the Memo instruction lists the walker's key as a signer, while a relayer key pays the fee. The Memo program logs verified signers, so what lands on chain is "this key asserted this walk", funded by a key the walker never holds. A memo transaction costs about 0.000005 SOL, so one devnet SOL covers roughly 200,000 walks.

**A relayer that signs anything is a faucet with extra steps.** That endpoint spends money on request, so it verifies what it's signing instead of trusting the client: exactly one instruction, addressed to the Memo program, within the program's own 566-byte limit, carrying at least one signer that isn't the relayer.

```ts
const walkerSigned = ix.keys.some((k) => k.isSigner && !k.pubkey.equals(relayer));
if (!walkerSigned) throw new Error("no walker signature on the memo instruction");
```

Drop that last check and anyone can drain it.

[IMAGE PLACEHOLDER 3: System flow diagram, 16:9 landscape, 1536x1024. Style: flat twilight-indigo #0E1020 background with a faint 40px graph-paper grid in #2E3358 at low opacity, chalk white #ECEAF6 text, amber #FFA046 for a claim being recorded, cyan #6FE3E8 for a fact settled on chain, rose #FF7A8F for a mismatch, bold grotesque display type, JetBrains Mono for all data and labels. Absolutely no gradients, glows or neon bloom. Title top-left in display type: "The walker signs. The server pays." Layout left to right, four stages. (1) Amber-outlined phone mockup labelled "WALKER'S PHONE" containing rows "watchPosition()", "round to 5dp", "SHA-256 in browser" and a small amber squiggle route. (2) Amber card labelled "TRACE" with monospace body "v1 / Rufus / 1786892767,30.26690,-97.77180 / …100 fixes" and a red stamp reading "NEVER LEAVES THE DEVICE". (3) Cyan-outlined card labelled "api/relay.ts — FEE RELAYER" with four stacked checklist rows "exactly 1 instruction", "Memo program only", "≤ 566 bytes", "signer ≠ relayer" and a small note beneath "pays the fee, signs nothing else". (4) Cyan card labelled "SOLANA DEVNET · SPL MEMO" with monospace body "{v:1, dog, t0, dur, dist, n, h}" and beneath it "147 / 566 bytes". Solid amber arrows for the outbound path labelled "1. record", "2. hash", "3. partialSign (walker)", "4. co-sign (relayer)". A dashed cyan arrow returning from stage 4 to stage 1 labelled "signature". Legend top-right: solid arrow = "walker's data", dashed arrow = "chain response". Bottom edge, single italic line: "The hash travels. The route does not."]

*The trust boundary, drawn. The relayer pays for the transaction and vouches for nothing in it.*

**Telling "this is broken" apart from "this is a lie".** This is the bug I shipped and then had to fix, and it's the one I'd want reviewed. The verifier originally did `JSON.parse(file) as Trace`. A TypeScript cast is a promise to the compiler, not a check at runtime, so malformed input sailed straight through. I tested four broken traces and **three of them hashed successfully**: a fix missing its timestamp, an empty `fixes` array, and a `NaN` latitude. Each produced a stable, confident, meaningless hash.

Which the UI then reported as: *the route you were given is not the route that was committed.*

That's an accusation of fraud caused by a corrupted file. For an app whose entire job is adjudicating trust between two people, that isn't a rough edge. It's the app doing the opposite of its job. The fix was hand-written type guards at the boundary, and the verifier now reports five outcomes: a match, a genuine mismatch, an unreadable trace, a transaction that isn't a walk attestation, and no such transaction. Exactly one of those is an accusation, and only that one is coloured red.

[IMAGE PLACEHOLDER 4: Before/after state comparison, 16:9 landscape, 1536x1024. Style: flat twilight-indigo #0E1020 background with a faint 40px graph-paper grid in #2E3358 at low opacity, chalk white #ECEAF6 text, amber #FFA046 for a claim being recorded, cyan #6FE3E8 for a fact settled on chain, rose #FF7A8F for a mismatch, bold grotesque display type, JetBrains Mono for all data and labels. Absolutely no gradients, glows or neon bloom. Two verdict cards side by side, same input file, divided by a thin #2E3358 vertical rule. Left card outlined in rose #FF7A8F with a small monospace kicker above it reading "BEFORE · JSON.parse(x) as Trace"; card heading in rose "No match", body text "This transaction is a valid walk attestation, and this file is a valid trace, but they are not the same walk." and beneath it a red handwritten annotation with a curved arrow reading "the file was empty. this is an accusation." Right card outlined in #2E3358 neutral grey with kicker "AFTER · parseTraceJson()"; card heading in chalk white "That file isn't a readable trace", body text "a trace needs at least 2 fixes, this one has 0" and below it "This says nothing about the walk." Bottom edge, small monospace centred: "same input · different claim".]

*The bug that mattered most. A corrupted file and a doctored file are not the same accusation, and the type system happily conflated them.*

**A hash has no opinion about *when*.** I found this late. The SHA-256 proves which route was recorded and says nothing about when, which leaves a gap an adversarial walker can stand in: record one genuinely excellent walk, keep the trace, commit it again next Tuesday. The hash matches perfectly, because it really is that walk. Just not this week's. The block timestamp is the one clock in the system the walker doesn't control, so the verifier compares it against the trace's own end time and reports the gap. A long delay has innocent explanations, so it states the number and lets the owner decide. "This took a while" and "you are lying to me" are not the same sentence.

[IMAGE PLACEHOLDER 5: Plate diagram, 16:9 landscape, 1536x1024. Style: flat twilight-indigo #0E1020 background with a faint 40px graph-paper grid in #2E3358 at low opacity, chalk white #ECEAF6 text, amber #FFA046 for a claim being recorded, cyan #6FE3E8 for a fact settled on chain, rose #FF7A8F for a mismatch, bold grotesque display type, JetBrains Mono for all data and labels. Absolutely no gradients, glows or neon bloom. Small-caps monospace kicker top-left reading "PROOF OF WALK · THE REPLAY GAP", plate number top-right in monospace "PLATE II / III". Display title beneath the kicker: "A hash has no opinion about when." Centre: a horizontal timeline rule in #2E3358 running the full width with three labelled markers. Marker one, amber, at far left, labelled "t0 + dur" with subtitle "walk ended, Tuesday". Marker two, amber, just right of it, labelled "committed" with subtitle "28 seconds later" and a short cyan bracket between the two markers labelled "fresh". Marker three, rose, at far right, labelled "committed again" with subtitle "the following Tuesday" and a long rose bracket spanning to it labelled "7 days". Above marker three a rose handwritten annotation with a curved arrow reading "same trace. same hash. Match." Below the timeline a single monospace line: "delaySeconds = blockTime - (t0 + dur)". Bottom edge, single italic line: "The block timestamp is the one clock the walker does not control."]

*The gap I found late. The hash proves which route was recorded, never when, so the chain's own clock has to say the rest.*

**The log is what a chain is actually for.** One attestation answers a narrow question. The one an owner really has is broader: what has this walker done for my dog? So the Log tab reads a key's whole committed record back off devnet with `getSignaturesForAddress`, validates every memo rather than assuming it's ours, and requires that the key actually *signed* the memo instruction. Otherwise anyone could pad someone else's log by naming their key as a read-only account. A walker can decline to record a walk and the log shows a gap. What they cannot do is delete one they already committed, or invent one they didn't. Absence is ambiguous. Presence is not.

[IMAGE PLACEHOLDER 6: REAL SCREENSHOT, NOT GENERATED — capture from the live app at https://proof-of-walk-jade.vercel.app. Open the Log tab, leave the walker key prefilled, press "Show the walks". Capture the full result at 1440px wide, showing the three-cell readout (WALKS / TOTAL / TIME), the "Walking Rufus" summary line, and the list of walk rows each with the dog name, a SIMULATED badge, distance, duration, timestamp and a "CHECK THIS ONE" link.]

*A record, not a receipt. This is also the moment the project stopped being about a walker and started being about a dog.*

**No map tiles, on purpose.** The route is drawn from the fixes themselves as a bare polyline on graph paper. A basemap would render the walker's actual neighbourhood on screen, and their home is usually at one end of the line.

**Or don't trust this app either.** An app that asks you to stop taking your walker's word for it has no business asking you to take its word instead. So the same verification runs offline in about a hundred lines. `npm run verify -- <signature> docs/example-walk.json` prints the hash from the chain, the hash of your file, and who signed the memo. Exit 0 for a match, 2 for a mismatch, 3 for a file it couldn't read, because those are three different things. It shares exactly one file with the website: the definition of which bytes get hashed. Two independent implementations reaching the same hash is worth more than either one insisting it's right.

![Terminal showing two runs of the offline verifier: the first prints MATCH with identical on-chain and this-file hashes and exit code 0; the second prints NO MATCH with a diverging this-file hash in red and exit code 2](docs/media/verify-terminal.png)

*No website involved. Checking a claim shouldn't require believing a second claim about the page doing the checking.*

Things I refused to do:

* Do not use `JSON.stringify` anywhere on the hashed path, however convenient it looks.
* Do not let the relayer sign the memo, because then the attestation asserts nothing about who walked.
* Do not report a parse failure as a mismatch, ever.
* Do not render a basemap under the route.
* Do not claim the app proves a dog was walked. It proves a device moved.

**Two honest concessions.** First, the walker's key lives in `localStorage` and is deliberately disposable, so a walker who clears their browser starts a new log and the old one is orphaned. Real key custody was out of scope for a weekend. Second, this runs on devnet, and devnet faucet airdrops are IP rate-limited hard enough that I funded the relayer by hand rather than programmatically.

---

## What I Learned

* **A cast is not a check.** `as Trace` is a promise to the compiler that costs nothing at runtime, and it let three malformed files produce confident hashes. The type system agreed with me right up until the app accused someone of fraud.
* **The worst bugs are the ones that only exist in production.** Both serverless functions crashed on deploy with `ERR_REQUIRE_ESM`, because `@solana/web3.js` pulls in `rpc-websockets`, whose CommonJS build requires an ESM-only `uuid@14`. It was unreproducible locally, because Node 22.12+ permits `require()` of an ES module and my machine runs 22.19. I wrote a regression test for it, watched it pass against a deliberately broken dependency tree, and deleted it. A test that cannot fail is worse than no test.
* **Verifiable beats impressive.** I spent the last stretch removing friction rather than adding features, because the real risk was never being wrong. It was being skimmed.
* **Write down what the thing doesn't prove.** It costs one paragraph and it's the difference between a claim and a pitch.

---

## Prize Categories

**Best Use of Solana.**

Solana is load-bearing here, not decorative. The attestation is an SPL Memo, and the walker-signs/relayer-pays split is the reason the whole thing works for someone with no wallet and no crypto literacy. The Log tab reads the chain as well as writing to it, and the block timestamp is what closes the replay gap, because it's the one clock in the system the walker can't touch. If a future change made the relayer the signer, the attestation would stop meaning anything and the project would lose its reason to be on a chain at all.

---

I'm still unsure about one thing, and I'd genuinely like an argument about it: the log shows gaps, but a gap is ambiguous. A walker who skipped Tuesday and a walker whose phone died look identical. Is there an honest way to distinguish those two without turning the app into surveillance of the person doing the walking?
