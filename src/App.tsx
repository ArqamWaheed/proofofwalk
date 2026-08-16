import { useState } from "react";
import { WalkView } from "./views/WalkView";
import { VerifyView } from "./views/VerifyView";

type Tab = "walk" | "verify";

export default function App() {
  const [tab, setTab] = useState<Tab>("walk");

  return (
    <main className="app">
      <header className="head">
        <h1>Proof of Walk</h1>
        <p className="tagline">
          Your dog walker says they went. This makes the walk say so too.
        </p>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "walk"}
          className={tab === "walk" ? "tab tab--on" : "tab"}
          onClick={() => setTab("walk")}>Walk</button>
        <button role="tab" aria-selected={tab === "verify"}
          className={tab === "verify" ? "tab tab--on" : "tab"}
          onClick={() => setTab("verify")}>Verify</button>
      </nav>

      {tab === "walk" ? <WalkView /> : <VerifyView />}

      <footer className="foot">
        <p>
          Solana <strong>devnet</strong>. The GPS trace stays on the device; only
          its SHA-256 is committed, inside an{" "}
          <a href="https://www.solana-program.com/docs/memo" target="_blank" rel="noreferrer">
            SPL Memo
          </a>.
        </p>
        <p className="hint">
          This proves a device recorded a route. It does not prove a dog was on
          the end of the leash.
        </p>
      </footer>
    </main>
  );
}
