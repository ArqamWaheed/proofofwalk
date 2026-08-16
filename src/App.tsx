import { useRef, useState } from "react";
import { WalkView } from "./views/WalkView";
import { VerifyView } from "./views/VerifyView";
import { Icon } from "./components/Icon";
import { CLUSTER } from "./lib/config";

type Tab = "walk" | "verify";

const TABS: ReadonlyArray<{ id: Tab; label: string; icon: "route" | "shield" }> = [
  { id: "walk", label: "Walk", icon: "route" },
  { id: "verify", label: "Verify", icon: "shield" },
];

/**
 * A ?tx=… link is someone being handed a walk to check, so open on the tab that
 * checks it. Landing them on the recorder and asking them to find Verify is the
 * difference between a claim that gets tested and one that gets skimmed.
 */
const initialTab = (): Tab =>
  new URLSearchParams(window.location.search).has("tx") ? "verify" : "walk";

export default function App() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ walk: null, verify: null });

  // Tablists are expected to move between tabs with the arrow keys; without
  // this a keyboard user has to tab out of the control and back in.
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab === "walk" ? "verify" : "walk";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="app">
      <header className="topbar">
        <p className="wordmark">
          <Icon name="paw" size={18} />
          Proof of Walk
        </p>
        <p className="chip">
          <span className="chip__dot" />
          Solana {CLUSTER}
        </p>
      </header>

      <div className="hero">
        <h1 className="hero__claim">
          Your dog walker says they went.{" "}
          <span className="hero__turn">This makes the walk say so too.</span>
        </h1>
        <svg className="hero__stroke" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M3 8.4c24-5.6 41 3.4 62-1.2s31-6.4 52-1.4 38 6.2 60 1.2 42-6.8 62-1.6 39 4.4 58 .8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="hero__sub">
          The route is recorded on the phone and hashed there. Only the hash is
          committed, signed by the walker's own key.
        </p>
      </div>

      <div className="switch" role="tablist" aria-label="Proof of Walk" data-active={tab} onKeyDown={onKeyDown}>
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            ref={(el) => { tabRefs.current[id] = el; }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            className="switch__tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
          >
            <Icon name={icon} size={16} />
            {label}
          </button>
        ))}
      </div>

      <main id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1}>
        {tab === "walk" ? <WalkView /> : <VerifyView />}
      </main>

      <footer className="foot">
        <p>
          Running on Solana <strong>devnet</strong>. The GPS trace stays on the
          device; only its SHA-256 goes on chain, inside an{" "}
          <a href="https://www.solana-program.com/docs/memo" target="_blank" rel="noreferrer">
            SPL Memo
          </a>.
        </p>
        <p>
          This proves a device recorded a route. It does not prove a dog was on
          the end of the leash.
        </p>
      </footer>
    </div>
  );
}
