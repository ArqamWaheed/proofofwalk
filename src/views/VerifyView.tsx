import { useState } from "react";
import { Connection } from "@solana/web3.js";
import { hashTrace, type Trace } from "../lib/trace";
import { readMemoFromTransaction, type Attestation } from "../lib/attest";
import { RPC_URL, explorerTx } from "../lib/config";

type Result =
  | { kind: "match"; attestation: Attestation; blockTime: number | null; signers: string[] }
  | { kind: "mismatch"; expected: string; actual: string; attestation: Attestation }
  | { kind: "error"; message: string };

export function VerifyView() {
  const [signature, setSignature] = useState("");
  const [traceJson, setTraceJson] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setTraceJson(await file.text());
  }

  async function verify() {
    setBusy(true);
    setResult(null);
    try {
      const trace = JSON.parse(traceJson) as Trace;
      if (!Array.isArray(trace.fixes)) throw new Error("that file has no `fixes` array");

      const connection = new Connection(RPC_URL, "confirmed");
      const found = await readMemoFromTransaction(connection, signature.trim());
      if (!found) {
        throw new Error("no such transaction on devnet, or it carries no memo");
      }

      const attestation = JSON.parse(found.memo) as Attestation;
      const actual = await hashTrace(trace);

      setResult(
        actual === attestation.h
          ? { kind: "match", attestation, blockTime: found.blockTime, signers: found.signers }
          : { kind: "mismatch", expected: attestation.h, actual, attestation },
      );
    } catch (e) {
      setResult({ kind: "error", message: e instanceof Error ? e.message : "verification failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <p className="lede">
        Paste the transaction the walker sent you and the trace file they gave
        you. This recomputes the hash locally and compares it with what the chain
        already recorded.
      </p>

      <label className="field">
        <span>Transaction signature</span>
        <input value={signature} onChange={(e) => setSignature(e.target.value)}
          placeholder="5xY…" spellCheck={false} />
      </label>

      <label className="field">
        <span>Trace file</span>
        <input type="file" accept="application/json"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>

      <label className="field">
        <span>…or paste the trace JSON</span>
        <textarea value={traceJson} onChange={(e) => setTraceJson(e.target.value)}
          rows={5} spellCheck={false} placeholder='{"version":1,"dog":"Rufus","fixes":[…]}' />
      </label>

      <button className="btn btn--primary" onClick={verify}
        disabled={busy || !signature.trim() || !traceJson.trim()}>
        {busy ? "Checking…" : "Verify"}
      </button>

      {result?.kind === "match" && (
        <div className="panel panel--ok">
          <h3>Match</h3>
          <p>
            This trace is the one that was committed. It was recorded for{" "}
            <strong>{result.attestation.dog}</strong>, ran{" "}
            <strong>{result.attestation.dist} m</strong> over{" "}
            <strong>{Math.round(result.attestation.dur / 60)} minutes</strong>, and the
            block was written at{" "}
            <strong>
              {result.blockTime
                ? new Date(result.blockTime * 1000).toLocaleString()
                : "an unrecorded time"}
            </strong>
            .
          </p>
          {result.attestation.sim === 1 && (
            <p className="banner">This attestation is flagged as a simulated walk.</p>
          )}
          <p className="hint">
            Signed by: {result.signers.map((s) => s.slice(0, 8) + "…").join(", ") || "—"}
          </p>
          <a className="btn" href={explorerTx(signature.trim())} target="_blank" rel="noreferrer">
            See it on Explorer
          </a>
        </div>
      )}

      {result?.kind === "mismatch" && (
        <div className="panel panel--bad">
          <h3>No match</h3>
          <p>
            This transaction is real, but it does not describe this trace. The
            file you were given is not the route that was committed.
          </p>
          <pre className="memo">
on chain:  {result.expected}
this file: {result.actual}
          </pre>
        </div>
      )}

      {result?.kind === "error" && <p className="error">{result.message}</p>}
    </section>
  );
}
