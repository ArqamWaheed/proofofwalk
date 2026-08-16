import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchWalkLog, summarise, type Walk } from "../lib/history";
import { commitFreshness, describeDelay } from "../lib/freshness";
import { loadWalker } from "../lib/attest";
import { RPC_URL } from "../lib/config";
import { Icon } from "../components/Icon";

const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtKm = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; walks: Walk[]; skipped: number }
  | { kind: "error"; message: string };

export function LogView() {
  const [key, setKey] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  // The walker's own key is the useful default on the device that did the
  // walking. An owner pastes the key their walker gave them instead.
  useEffect(() => {
    try { setKey(loadWalker().publicKey.toBase58()); } catch { /* no key yet */ }
  }, []);

  async function load() {
    setState({ kind: "loading" });
    try {
      const walker = new PublicKey(key.trim());
      const connection = new Connection(RPC_URL, "confirmed");
      const { walks, skipped } = await fetchWalkLog(connection, walker);
      setState({ kind: "loaded", walks, skipped });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "could not read this key's history",
      });
    }
  }

  const summary = state.kind === "loaded" ? summarise(state.walks) : null;

  return (
    <section className="stack">
      <p className="lede">
        Every walk a key has committed, read back off the chain. A walker can
        decline to record a walk — that shows up as a gap. What they cannot do is
        delete one they already committed, or invent one they didn't.
      </p>

      <label className="field">
        <span className="field__label">Walker key</span>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="the public key the walker gave you"
          spellCheck={false}
          autoComplete="off"
        />
        <p className="field__note">
          On the walker's own phone this is filled in already. An owner pastes
          the key their walker shared.
        </p>
      </label>

      <button
        className="btn btn--seal btn--wide"
        onClick={load}
        disabled={state.kind === "loading" || !key.trim()}
      >
        <Icon name="paw" size={17} />
        {state.kind === "loading" ? "Reading the chain…" : "Show the walks"}
      </button>

      {state.kind === "error" && (
        <p className="notice notice--bad" role="alert">
          <Icon name="alert" size={17} />
          <span>{state.message} — check the key and try again.</span>
        </p>
      )}

      {state.kind === "loaded" && summary && (
        <div aria-live="polite" className="stack">
          {summary.walks === 0 ? (
            <div className="card">
              <h2 className="card__title">
                <Icon name="question" size={18} />
                No walks committed by this key
              </h2>
              <p className="card__body">
                Either this walker has not recorded anything yet, or this is not
                the key you were given. An empty log is not evidence of
                anything on its own.
              </p>
            </div>
          ) : (
            <>
              <div className="readout">
                <Cell label="Walks" value={String(summary.walks)} />
                <Cell label="Total" value={fmtKm(summary.totalMetres)} />
                <Cell label="Time" value={fmtDuration(summary.totalSeconds)} />
              </div>

              {summary.dogs.length > 0 && (
                <p className="hint">
                  {summary.dogs.length === 1 ? "Walking " : "Walking for "}
                  <strong>{summary.dogs.join(", ")}</strong>
                  {summary.simulated > 0 && (
                    <>
                      {" · "}
                      {summary.simulated === summary.walks
                        ? summary.walks === 1 ? "simulated" : "all simulated"
                        : `${summary.simulated} of ${summary.walks} simulated`}
                    </>
                  )}
                </p>
              )}

              <ol className="log">
                {state.walks.map((w) => {
                  const f = commitFreshness(w.attestation, w.blockTime);
                  return (
                    <li key={w.signature} className="log__row">
                      <div className="log__head">
                        <span className="log__dog">{w.attestation.dog}</span>
                        {w.attestation.sim === 1 && <span className="log__flag">simulated</span>}
                      </div>
                      <p className="log__meta">
                        {fmtKm(w.attestation.dist)} · {fmtDuration(w.attestation.dur)} ·{" "}
                        {w.blockTime
                          ? new Date(w.blockTime * 1000).toLocaleString()
                          : "time not recorded"}
                      </p>
                      {(f.kind === "stale" || f.kind === "impossible") && (
                        <p className="log__warn">
                          <Icon name="alert" size={14} />
                          {f.kind === "impossible"
                            ? "committed before the walk could have ended"
                            : `committed ${describeDelay(f.delaySeconds)} after the walk`}
                        </p>
                      )}
                      <a className="log__check" href={`?tx=${w.signature}`}>
                        <Icon name="shield" size={14} />
                        Check this one
                      </a>
                    </li>
                  );
                })}
              </ol>

              {state.skipped > 0 && (
                <p className="hint">
                  {state.skipped} other transaction{state.skipped === 1 ? "" : "s"} by
                  this key carried no walk attestation this app could read, and
                  {state.skipped === 1 ? " was" : " were"} left out.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="readout__cell">
      <span className="readout__label">{label}</span>
      <span className="readout__value">{value}</span>
    </div>
  );
}
