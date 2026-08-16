import { useMemo, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { RouteSketch } from "../components/RouteSketch";
import { useWalk } from "../lib/useWalk";
import { simulateWalk } from "../lib/simulate";
import { durationSeconds, totalMetres, type Trace } from "../lib/trace";
import {
  buildAttestation, buildWalkTransaction, encodeMemo, loadWalker,
  type Attestation,
} from "../lib/attest";
import { RPC_URL, explorerTx } from "../lib/config";

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;

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

  return (
    <section className="stack">
      <label className="field">
        <span>Dog</span>
        <input value={dog} onChange={(e) => setDog(e.target.value)}
          disabled={state === "recording"} maxLength={40} />
      </label>

      {state === "idle" && (
        <div className="row">
          <button className="btn btn--primary" onClick={start}>Start walk</button>
          <button className="btn" onClick={() => handleFinish(true)}>
            Run a simulated walk
          </button>
        </div>
      )}

      {state === "recording" && (
        <>
          <div className="stats">
            <Stat label="Elapsed" value={fmtDuration(duration)} />
            <Stat label="Distance" value={`${distance} m`} />
            <Stat label="Fixes" value={String(fixes.length)} />
          </div>
          <RouteSketch fixes={fixes} />
          <button className="btn btn--primary" onClick={() => handleFinish(false)}
            disabled={fixes.length < 2}>
            Finish walk
          </button>
          {fixes.length < 2 && <p className="hint">Waiting for a second GPS fix…</p>}
        </>
      )}

      {error && <p className="error">{error}</p>}

      {state === "finished" && attestation && (
        <>
          {simulated && (
            <p className="banner">
              Simulated walk. This is a synthetic route, and the attestation is
              flagged <code>sim: 1</code> so it stays distinguishable on chain.
            </p>
          )}
          <div className="stats">
            <Stat label="Duration" value={fmtDuration(attestation.dur)} />
            <Stat label="Distance" value={`${attestation.dist} m`} />
            <Stat label="Fixes" value={String(attestation.n)} />
          </div>
          <RouteSketch fixes={fixes} />

          <div className="panel">
            <h3>What goes on chain</h3>
            <pre className="memo">{JSON.stringify(attestation, null, 2)}</pre>
            <p className="hint">
              {new TextEncoder().encode(JSON.stringify(attestation)).length} of 566 bytes.
              The route itself is not in here — only its SHA-256.
            </p>
          </div>

          {!signature && (
            <div className="row">
              <button className="btn btn--primary" onClick={commit} disabled={busy}>
                {busy ? "Committing…" : "Commit to Solana"}
              </button>
              <button className="btn" onClick={() => { reset(); setAttestation(null); }}>
                Discard
              </button>
            </div>
          )}
          {commitError && <p className="error">{commitError}</p>}

          {signature && (
            <div className="panel panel--ok">
              <h3>Committed</h3>
              <p>
                Signed by <code>{walker.publicKey.toBase58().slice(0, 8)}…</code> —
                the walker's key, not the server's.
              </p>
              <div className="row">
                <a className="btn btn--primary" href={explorerTx(signature)}
                  target="_blank" rel="noreferrer">View on Solana Explorer</a>
                <button className="btn" onClick={downloadTrace}>Download the trace</button>
              </div>
              <p className="hint">
                Send the trace file to the owner. They can check it against this
                transaction on the Verify tab — and the hash will only match the
                route that was actually recorded.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
