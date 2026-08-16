import { useState } from "react";
import { Connection } from "@solana/web3.js";
import { hashTrace } from "../lib/trace";
import { readMemoFromTransaction, type Attestation } from "../lib/attest";
import { parseAttestationJson, parseTraceJson } from "../lib/schema";
import { RPC_URL, explorerTx } from "../lib/config";

/**
 * The outcomes are deliberately separate.
 *
 * "This trace does not match" is an accusation. "This file is malformed" and
 * "that transaction is not a walk attestation" are not. Collapsing them into one
 * failure state is the bug this view previously shipped, and telling them apart
 * is most of what this screen is for.
 */
type Result =
  | { kind: "match"; attestation: Attestation; blockTime: number | null; signers: string[] }
  | { kind: "mismatch"; expected: string; actual: string; attestation: Attestation }
  | { kind: "bad-trace"; message: string }
  | { kind: "bad-memo"; message: string }
  | { kind: "not-found" }
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
      const trace = parseTraceJson(traceJson);
      if (!trace.ok) {
        setResult({ kind: "bad-trace", message: trace.error });
        return;
      }

      const connection = new Connection(RPC_URL, "confirmed");
      const found = await readMemoFromTransaction(connection, signature.trim());
      if (!found) {
        setResult({ kind: "not-found" });
        return;
      }

      const attestation = parseAttestationJson(found.memo);
      if (!attestation.ok) {
        setResult({ kind: "bad-memo", message: attestation.error });
        return;
      }

      const actual = await hashTrace(trace.value);
      setResult(
        actual === attestation.value.h
          ? { kind: "match", attestation: attestation.value, blockTime: found.blockTime, signers: found.signers }
          : { kind: "mismatch", expected: attestation.value.h, actual, attestation: attestation.value },
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
            This transaction is a valid walk attestation, and this file is a valid
            trace — but they are not the same walk. The route you were given is
            not the route that was committed.
          </p>
          <pre className="memo">
on chain:  {result.expected}
this file: {result.actual}
          </pre>
        </div>
      )}

      {result?.kind === "bad-trace" && (
        <div className="panel">
          <h3>That file isn't a readable trace</h3>
          <p className="hint">{result.message}</p>
          <p>
            This says nothing about the walk — the file could not be read, so
            there was nothing to compare. Ask for the trace file the app
            downloaded, unedited.
          </p>
        </div>
      )}

      {result?.kind === "bad-memo" && (
        <div className="panel">
          <h3>That transaction isn't a walk attestation</h3>
          <p className="hint">{result.message}</p>
          <p>
            The transaction exists and carries a memo, but not one this app
            wrote. Check you were given the right signature.
          </p>
        </div>
      )}

      {result?.kind === "not-found" && (
        <div className="panel">
          <h3>No such transaction</h3>
          <p>
            Nothing with that signature is on devnet, or it carries no memo.
            Confirmed transactions can take a moment to appear.
          </p>
        </div>
      )}

      {result?.kind === "error" && <p className="error">{result.message}</p>}
    </section>
  );
}
