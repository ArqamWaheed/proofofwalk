import { useMemo, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { RouteSketch } from "../components/RouteSketch";
import { Seal } from "../components/Seal";
import { Icon } from "../components/Icon";
import { useWalk } from "../lib/useWalk";
import { simulateWalk } from "../lib/simulate";
import { durationSeconds, totalMetres, type Trace } from "../lib/trace";
import {
  MEMO_MAX_BYTES, buildAttestation, buildWalkTransaction, encodeMemo, loadWalker,
  type Attestation,
} from "../lib/attest";
import { RPC_URL, explorerTx } from "../lib/config";

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const shortKey = (key: string) => `${key.slice(0, 4)}…${key.slice(-4)}`;

type Step = "todo" | "now" | "done";

export function WalkView() {
  const { state, fixes, simulated, error, start, finish, runSimulated, reset } = useWalk();
  const [dog, setDog] = useState("Rufus");
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const walker = useMemo(() => loadWalker(), []);
  const trace: Trace = useMemo(() => ({ version: 1, dog, fixes }), [dog, fixes]);

  const distance = totalMetres(fixes);
  const duration = durationSeconds(fixes);

  const steps: Array<{ label: string; state: Step }> = [
    { label: "record", state: state === "finished" ? "done" : state === "recording" ? "now" : "todo" },
    { label: "seal", state: signature ? "done" : attestation ? "now" : "todo" },
    { label: "commit", state: signature ? "done" : attestation ? "todo" : "todo" },
  ];

  async function handleFinish(sim: boolean) {
    const walkFixes = sim ? simulateWalk() : fixes;
    if (sim) runSimulated(walkFixes);
    else finish();
    setAttestation(
      await buildAttestation({ version: 1, dog, fixes: walkFixes }, { simulated: sim }),
    );
    setSignature(null);
    setCommitError(null);
  }

  async function commit() {
    if (!attestation) return;
    setBusy(true);
    setCommitError(null);
    try {
      const memo = encodeMemo(attestation);
      const connection = new Connection(RPC_URL, "confirmed");
      const { blockhash } = await connection.getLatestBlockhash("confirmed");

      const relayerRes = await fetch("/api/relayer");
      if (!relayerRes.ok) throw new Error("relayer unavailable");
      const { relayer } = await relayerRes.json();

      const tx = buildWalkTransaction(
        walker.publicKey, new PublicKey(relayer), memo, blockhash,
      );
      // The walker signs here, in the browser. Their key never goes anywhere.
      tx.partialSign(walker);

      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "relay failed");
      setSignature(body.signature);
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "commit failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadTrace() {
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `walk-${dog}-${attestation?.t0 ?? "trace"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const memoBytes = attestation
    ? new TextEncoder().encode(JSON.stringify(attestation)).length
    : 0;

  return (
    <section className="stack">
      <ol className="steps">
        {steps.map((step) => (
          <li key={step.label} className="steps__item" data-state={step.state}>
            <span className="steps__pip" />
            {step.label}
          </li>
        ))}
      </ol>

      <label className="field">
        <span className="field__label">Dog</span>
        <input
          value={dog}
          onChange={(e) => setDog(e.target.value)}
          /* Locked once recording starts: the name is inside the hashed trace,
             so editing it afterwards would break the walk it belongs to. */
          disabled={state !== "idle"}
          maxLength={40}
        />
      </label>

      {state === "idle" && (
        <>
          <div className="row">
            <button className="btn btn--go" onClick={start}>
              <Icon name="route" size={17} />
              Start walk
            </button>
            <button className="btn" onClick={() => handleFinish(true)}>
              Run a simulated walk
            </button>
          </div>
          <p className="hint">
            Walking keeps the phone's location on until you finish. On a desktop
            with no GPS, the simulated walk produces a synthetic route and marks
            it as one on chain.
          </p>
        </>
      )}

      {state === "recording" && (
        <>
          <div className="readout readout--live">
            <Cell label="Elapsed" value={fmtDuration(duration)} />
            <Cell label="Distance" value={`${distance} m`} />
            <Cell label="Fixes" value={String(fixes.length)} />
          </div>
          <RouteSketch fixes={fixes} live />
          <button
            className="btn btn--go btn--wide"
            onClick={() => handleFinish(false)}
            disabled={fixes.length < 2}
          >
            Finish walk
          </button>
          {fixes.length < 2 && (
            <p className="hint">Waiting for a second GPS fix before there is a route to seal.</p>
          )}
        </>
      )}

      {error && (
        <p className="notice notice--bad" role="alert">
          <Icon name="alert" size={17} />
          {error}
        </p>
      )}

      {state === "finished" && attestation && (
        <>
          {simulated && (
            <p className="notice notice--warn">
              <Icon name="alert" size={17} />
              <span>
                Simulated walk. The route is synthetic and the attestation carries{" "}
                <code>sim: 1</code>, so it stays distinguishable from a real one on chain.
              </span>
            </p>
          )}

          <div className="readout">
            <Cell label="Duration" value={fmtDuration(attestation.dur)} />
            <Cell label="Distance" value={`${attestation.dist} m`} />
            <Cell label="Fixes" value={String(attestation.n)} />
          </div>

          <RouteSketch fixes={fixes} />

          <div className="card rise">
            <h2 className="card__title">
              <Icon name="link" size={17} />
              What goes on chain
            </h2>
            <Seal hash={attestation.h} label="this walk" />
            <p className="card__body">
              The route is not in here. Only this hash, the totals, and the dog's
              name travel to the chain.
            </p>
            <details>
              <summary className="field__label" style={{ cursor: "pointer" }}>
                Show the memo
              </summary>
              <pre className="memo" style={{ marginTop: "0.75rem" }}>
                {JSON.stringify(attestation, null, 2)}
              </pre>
            </details>
            <p className="meter">
              <span>{memoBytes} / {MEMO_MAX_BYTES} bytes</span>
              <span className="meter__track">
                <span
                  className="meter__fill"
                  style={{ width: `${Math.min(100, (memoBytes / MEMO_MAX_BYTES) * 100)}%` }}
                />
              </span>
            </p>
          </div>

          {!signature && (
            <div className="row">
              <button className="btn btn--seal" onClick={commit} disabled={busy}>
                {busy ? "Committing…" : "Commit to Solana"}
              </button>
              <button className="btn" onClick={() => { reset(); setAttestation(null); }}>
                Discard
              </button>
            </div>
          )}

          {commitError && (
            <p className="notice notice--bad" role="alert">
              <Icon name="alert" size={17} />
              <span>
                {commitError} — the walk is still here, so you can commit again.
              </span>
            </p>
          )}

          {signature && (
            <div className="card card--ok rise">
              <h2 className="card__title">
                <Icon name="check" size={18} />
                Committed
              </h2>
              <p className="card__body">
                Signed by <code>{shortKey(walker.publicKey.toBase58())}</code> — the
                walker's key, not the server's. The server paid the fee and vouched
                for nothing.
              </p>
              <div className="row">
                <a
                  className="btn btn--seal"
                  href={explorerTx(signature)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="external" size={16} />
                  View on Solana Explorer
                </a>
                <button className="btn" onClick={downloadTrace}>
                  <Icon name="download" size={16} />
                  Download the trace
                </button>
              </div>
              <p className="hint">
                Send the owner the trace file and this signature. On the Verify
                tab the hash will match this walk and no other.
              </p>
            </div>
          )}
        </>
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
