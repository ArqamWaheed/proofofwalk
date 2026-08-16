# Screen recording — shot list

Target 60–75s, unlisted YouTube. Record at 1280×720 or larger, desktop browser,
on the live site. Use **Run a simulated walk** so the take is repeatable and the
route is instant.

Have this ready before you hit record:

- The live app open at https://proof-of-walk-jade.vercel.app
- `docs/example-walk.json` open in an editor, or the trace you download in take
- Browser zoom at 100%, window ~1280 wide so the single column fills the frame

The verdict pair at the end is the point of the whole thing. Budget time for it
and do not rush the two seals.

---

### 0:00–0:08 — The problem

**Show:** the landing hero.

> "You pay someone to walk your dog. They tell you they went. You weren't there."

Let the headline sit on screen for a beat — it says the rest.

### 0:08–0:20 — Record

**Show:** type a dog name, click **Run a simulated walk**.

> "The walk is recorded on the phone. Distance, duration, the shape of the route."

Scroll so the route sketch and the three stats are both visible.

### 0:20–0:32 — Seal

**Show:** the "What goes on chain" card. Expand **Show the memo**.

> "The route never leaves the device. Only its SHA-256 does — 147 bytes, and the
> coordinates aren't in there."

Point at the byte meter. This is the privacy claim; make it explicit.

### 0:32–0:44 — Commit

**Show:** click **Commit to Solana**, wait for the Committed card.

> "It's signed by the walker's own key. The server pays the fee and vouches for
> nothing."

Click **View on Solana Explorer** and let the transaction render for ~2s so it's
visibly real, then come back.

### 0:44–0:58 — Match

**Show:** Verify tab. Paste the signature, load the trace file, click Verify.

> "The owner recomputes the hash locally and compares it with the chain."

Let the **Match** card land. The seal bars and "Signed by" are worth a beat.

### 0:58–1:10 — No match, the payoff

**Show:** change one digit of one coordinate in the pasted JSON. Verify again.

> "Move one fix by eleven metres — and it's a different walk."

Stop on the two seals. Cyan on top, red below, obviously different. **Hold for a
full three seconds.** This single frame carries the whole argument; everything
before it is setup.

### 1:10–1:15 — The honest close

**Show:** scroll to the footer line.

> "It proves a device recorded a route. Not that a dog was on the end of the
> leash. It narrows the gap between 'trust me' and 'check it'."

---

## Do not

- Show the Vercel dashboard, the relayer key, or any environment variable
- Show a real walk with your actual home at one end of the line
- Narrate the stack. Nobody is scoring you on "React and Vite"
