import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const SIG = "2q3GiHfvYBPyh8dNdYMWRTz6aPWQjjhAdJAm12g4UQ1CYAzZcNZNVAgDHJE4FmLUNVN1Qw7fzVgmgAUoSAHFhYST";
const URL = `https://proof-of-walk-jade.vercel.app/?tx=${SIG}`;
const WALKER = "2VHGyh3pUniStLvhey7RTFJeTzVeubvne4Rb75NTM3Df";
const OUT = process.argv[2] ?? "./out";
const W = 1280, H = 720;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: W, height: H } },
  colorScheme: "dark",
});
const page = await ctx.newPage();

// ---- overlay chrome: caption bar, title card, and a cursor that actually moves ----
async function installOverlay() {
  await page.addStyleTag({ content: `
    #rec-cursor {
      position: fixed; z-index: 2147483647; left: 0; top: 0;
      width: 22px; height: 22px; pointer-events: none;
      transform: translate(640px, 400px);
      transition: transform 620ms cubic-bezier(.22,.61,.36,1);
      will-change: transform;
    }
    #rec-cursor svg { filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); }
    #rec-cursor.click::after {
      content: ""; position: absolute; left: -13px; top: -13px;
      width: 48px; height: 48px; border-radius: 50%;
      border: 2px solid #6FE3E8; animation: rec-ping 500ms ease-out forwards;
    }
    @keyframes rec-ping { from { transform: scale(.2); opacity: 1 } to { transform: scale(1); opacity: 0 } }
    #rec-cap {
      position: fixed; z-index: 2147483646; left: 0; right: 0; bottom: 0;
      padding: 40px 40px 30px;
      background: linear-gradient(to top, #06070F 0%, #06070F 62%, rgba(6,7,15,.92) 82%, rgba(6,7,15,0) 100%);
      font-family: "Instrument Sans", system-ui, sans-serif;
      font-size: 26px; line-height: 1.35; font-weight: 500; color: #ECEAF6;
      text-align: center; opacity: 0; transition: opacity 320ms ease;
      text-wrap: balance;
    }
    #rec-cap.on { opacity: 1 }
    #rec-cap b { color: #6FE3E8; font-weight: 600 }
    #rec-cap i { color: #FFA046; font-style: normal; font-weight: 600 }
    #rec-card {
      position: fixed; inset: 0; z-index: 2147483645; display: grid; place-content: center;
      text-align: center; background: #0E1020; gap: 14px;
      opacity: 0; transition: opacity 420ms ease; pointer-events: none;
    }
    #rec-card.on { opacity: 1 }
    body.rec-carding #rec-cursor { opacity: 0; transition: opacity 200ms ease }
    #rec-card h2 {
      margin: 0; font-family: "Bricolage Grotesque", system-ui, sans-serif;
      font-size: 54px; font-weight: 700; letter-spacing: -.035em; color: #ECEAF6; max-width: 18ch;
    }
    #rec-card p { margin: 0; font-family: "JetBrains Mono", monospace; font-size: 15px;
      letter-spacing: .16em; text-transform: uppercase; color: #8386ac }
  `});
  await page.evaluate(() => {
    const cur = document.createElement("div");
    cur.id = "rec-cursor";
    cur.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 2l14 9-6.2 1.4L9.6 19 5 2z" fill="#fff" stroke="#0E1020" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(cur);
    const cap = document.createElement("div"); cap.id = "rec-cap"; document.body.appendChild(cap);
    const card = document.createElement("div"); card.id = "rec-card";
    card.innerHTML = `<p></p><h2></h2>`; document.body.appendChild(card);
  });
}

const sleep = (ms) => page.waitForTimeout(ms);

// Narration has to land on the same frame as its caption, so the run records
// when each line actually appeared rather than us predicting it.
const T0 = Date.now();
const timeline = [];
const mark = (text) => timeline.push({ atMs: Date.now() - T0, text });

async function say(html, holdMs = 2600) {
  mark(html);
  await page.evaluate((h) => {
    const c = document.getElementById("rec-cap");
    c.classList.remove("on");
    setTimeout(() => { c.innerHTML = h; c.classList.add("on"); }, 200);
  }, html);
  await sleep(holdMs);
}
async function clearCap() {
  await page.evaluate(() => document.getElementById("rec-cap").classList.remove("on"));
  await sleep(280);
}
async function card(kicker, title, holdMs = 2600) {
  mark(title);
  await page.evaluate(([k, t]) => {
    const c = document.getElementById("rec-card");
    c.querySelector("p").textContent = k;
    c.querySelector("h2").textContent = t;
    c.classList.add("on");
    document.body.classList.add("rec-carding");
  }, [kicker, title]);
  await sleep(holdMs);
  await page.evaluate(() => {
    document.getElementById("rec-card").classList.remove("on");
    document.body.classList.remove("rec-carding");
  });
  await sleep(500);
}
async function moveTo(x, y) {
  await page.evaluate(([x, y]) => {
    document.getElementById("rec-cursor").style.transform = `translate(${x}px, ${y}px)`;
  }, [x, y]);
  await sleep(700);
}
/** Move the visible cursor to a locator, ping it, then really click it. */
async function clickIt(locator) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(400);
  const b = await locator.boundingBox();
  if (!b) throw new Error("no bounding box for target");
  await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  await page.evaluate(() => {
    const c = document.getElementById("rec-cursor");
    c.classList.add("click"); setTimeout(() => c.classList.remove("click"), 520);
  });
  await sleep(240);
  await locator.click();
}
async function focusOn(locator, lift = 70) {
  // scrollIntoViewIfNeeded parks the target at the edge, which put the seals
  // under the caption bar. Centre it, then lift it clear of the scrim.
  await locator.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
  await sleep(650);
  await page.evaluate((n) => window.scrollBy({ top: n, behavior: "smooth" }), lift);
  await sleep(650);
}

// ---------------------------------------------------------------- the demo
await page.goto(URL, { waitUntil: "networkidle" });
await installOverlay();
await sleep(700);

await card("PROOF OF WALK · SOLANA DEVNET", "Your dog walker says they went.", 2800);

await say("You pay someone to walk your dog.<br>They say they went. You weren't there.", 3400);
await say("This link opens a walk already committed to <b>Solana devnet</b>.", 3000);

await clickIt(page.getByRole("button", { name: /Load the example walk/i }));
await say("Load the trace the walker handed over.", 2600);
await clearCap();

await clickIt(page.getByRole("button", { name: /^Verify$/i }));
await say("The hash is recomputed here, in your browser.", 2800);

await page.getByText("Match", { exact: true }).first().waitFor({ timeout: 25000 });
await focusOn(page.locator(".card--ok"), 40);
await say("<b>Match.</b> This is the trace that was committed.", 3200);
await say("Committed <b>28 seconds</b> after the walk ended.", 2800);
await clearCap();

await clickIt(page.getByRole("button", { name: /Now edit one coordinate/i }));
await say("Now move a single GPS fix. <i>Eleven metres.</i>", 3000);
await clearCap();

await clickIt(page.getByRole("button", { name: /^Verify$/i }));
await page.getByText("No match", { exact: true }).first().waitFor({ timeout: 25000 });
await focusOn(page.locator(".card--bad"), 40);
await say("<i>No match.</i> Same walk. One digit different.", 3200);
await say("Each hash drawn as 32 bars. The difference is <b>visible</b>.", 4200);
  await sleep(900);
await clearCap();

await clickIt(page.getByRole("tab", { name: /Log/i }));
await sleep(600);
// A fresh browser profile has no walker key in localStorage, which is exactly
// the owner's situation: they paste the key their walker gave them.
const keyField = page.locator('input[placeholder*="public key"]');
await keyField.scrollIntoViewIfNeeded();
await sleep(300);
await keyField.fill("");
await keyField.type(WALKER, { delay: 16 });
await say("An owner pastes the key their walker gave them.", 2200);
await clearCap();
await clickIt(page.getByRole("button", { name: /Show the walks/i }));
await say("Reading every walk this key ever committed…", 2000);
await page.locator(".log__row").first().waitFor({ timeout: 45000 });
  await focusOn(page.locator(".log"), 30);
  await say("And it isn't one receipt. It's the dog's record.", 3400);
await sleep(1500);
await clearCap();

await card("THE HONEST PART", "The route never leaves the phone. Only the hash goes on chain.", 3400);

await ctx.close();
await browser.close();
const { writeFileSync } = await import("node:fs");
writeFileSync(`${OUT}/timeline.json`, JSON.stringify(timeline, null, 1));
console.log("done, beats:", timeline.length);
