/**
 * End-to-end check against live devnet, using the same modules the browser uses.
 * Walker signs, relayer pays, memo lands, read it back and verify the hash.
 */
import fs from "node:fs";
import { Connection, Keypair } from "@solana/web3.js";
import { buildAttestation, buildWalkTransaction, encodeMemo, readMemoFromTransaction } from "../src/lib/attest";
import { simulateWalk } from "../src/lib/simulate";
import { hashTrace, type Trace } from "../src/lib/trace";

const RPC = "https://api.devnet.solana.com";
const relayer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(".relayer-key.json", "utf8"))),
);
const walker = Keypair.generate();
const connection = new Connection(RPC, "confirmed");

const trace: Trace = { version: 1, dog: "Rufus", fixes: simulateWalk() };
const attestation = await buildAttestation(trace, { simulated: true });
const memo = encodeMemo(attestation);

console.log("attestation:", memo);
console.log("memo bytes :", Buffer.byteLength(memo), "/ 566");
console.log("walker     :", walker.publicKey.toBase58());

const { blockhash } = await connection.getLatestBlockhash("confirmed");
const tx = buildWalkTransaction(walker.publicKey, relayer.publicKey, memo, blockhash);
tx.partialSign(walker);   // browser
tx.partialSign(relayer);  // server

const sig = await connection.sendRawTransaction(tx.serialize());
const bh = await connection.getLatestBlockhash("confirmed");
await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
console.log("\nTX:", sig);
console.log("explorer: https://explorer.solana.com/tx/" + sig + "?cluster=devnet");

// Read it back the way the Verify tab does.
const found = await readMemoFromTransaction(connection, sig);
if (!found) throw new Error("FAIL: memo not readable back");
console.log("\nmemo read back:", found.memo);
console.log("blockTime     :", found.blockTime, new Date((found.blockTime ?? 0) * 1000).toISOString());
console.log("signers       :", found.signers);

const parsed = JSON.parse(found.memo);
const recomputed = await hashTrace(trace);
console.log("\nhash on chain :", parsed.h);
console.log("hash recomputed:", recomputed);
console.log(recomputed === parsed.h ? "\n✅ MATCH" : "\n❌ MISMATCH");

// Negative case: a tampered trace must not verify.
const tampered: Trace = { ...trace, fixes: trace.fixes.slice(0, -5) };
const tamperedHash = await hashTrace(tampered);
console.log(tamperedHash !== parsed.h ? "✅ tampered trace correctly rejected" : "❌ tampered trace passed");
console.log("walker is a verified signer:", found.signers.includes(walker.publicKey.toBase58()) ? "✅" : "❌");
