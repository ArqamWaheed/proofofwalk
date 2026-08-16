/**
 * Verify a walk without this project's website.
 *
 * The app asks an owner to believe a claim about a walker. It would be a poor
 * showing if checking that claim required believing a second one — that the web
 * page doing the checking is honest. So this is the same verification, offline,
 * in a file short enough to read in a couple of minutes.
 *
 *   npm run verify -- <signature> <trace.json>
 *
 * It shares exactly one thing with the app: `src/lib/trace.ts`, which defines
 * the bytes that get hashed. That file is the wire contract; everything else
 * here is a fresh read of the chain.
 */

import { readFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { hashTrace } from "../src/lib/trace";
import { parseAttestationJson, parseTraceJson } from "../src/lib/schema";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const EXIT = { match: 0, mismatch: 2, unreadable: 3, notFound: 4, usage: 64 } as const;

function say(line = "") { process.stdout.write(line + "\n"); }

async function main() {
  const [signature, tracePath] = process.argv.slice(2);
  if (!signature || !tracePath) {
    say("usage: npm run verify -- <transaction-signature> <path-to-trace.json>");
    process.exit(EXIT.usage);
  }

  const trace = parseTraceJson(readFileSync(tracePath, "utf8"));
  if (!trace.ok) {
    // Not an accusation. The file could not be read, so nothing was compared.
    say(`UNREADABLE TRACE  ${trace.error}`);
    say("Nothing was compared, so this says nothing about the walk.");
    process.exit(EXIT.unreadable);
  }

  const connection = new Connection(RPC, "confirmed");
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) {
    say(`NOT FOUND  no confirmed transaction ${signature} on ${RPC}`);
    process.exit(EXIT.notFound);
  }

  const keys = tx.transaction.message.getAccountKeys();
  const memoIx = tx.transaction.message.compiledInstructions.find(
    (ix) => keys.get(ix.programIdIndex)?.equals(MEMO_PROGRAM_ID),
  );
  if (!memoIx) {
    say("NOT AN ATTESTATION  that transaction carries no SPL Memo instruction.");
    process.exit(EXIT.unreadable);
  }

  const attestation = parseAttestationJson(new TextDecoder().decode(memoIx.data));
  if (!attestation.ok) {
    say(`NOT AN ATTESTATION  ${attestation.error}`);
    process.exit(EXIT.unreadable);
  }

  const signers = memoIx.accountKeyIndexes
    .map((i) => keys.get(i))
    .filter((k): k is PublicKey => !!k)
    .map((k) => k.toBase58());

  const actual = await hashTrace(trace.value);
  const a = attestation.value;
  const matched = actual === a.h;

  say(matched ? "MATCH" : "NO MATCH");
  say();
  say(`  dog          ${a.dog}`);
  say(`  distance     ${a.dist} m over ${Math.round(a.dur / 60)} min, ${a.n} fixes`);
  say(`  on chain     ${a.h}`);
  say(`  this file    ${actual}`);
  say(`  memo signer  ${signers.join(", ") || "—"}`);
  say(`  block time   ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "not recorded"}`);
  if (a.sim === 1) say("  note         flagged as a simulated walk");

  if (tx.blockTime) {
    const delay = tx.blockTime - (a.t0 + a.dur);
    say(`  committed    ${Math.round(delay / 60)} min after the walk ended`);
  }

  say();
  say(matched
    ? "The trace you were given is the trace that was committed."
    : "Both inputs are well-formed, but they are not the same walk.");

  process.exit(matched ? EXIT.match : EXIT.mismatch);
}

main().catch((e) => {
  say(`ERROR  ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
