/**
 * Every walk a key has committed.
 *
 * A single attestation answers "did this one walk happen?". That is the narrow
 * question. The one an owner actually has is broader: *what has this walker
 * done for my dog?* — and that is a question a public chain answers unusually
 * well, because the walker cannot quietly withhold a record they have already
 * published.
 *
 * Note the asymmetry this creates. A walker can decline to commit a walk, and
 * the log will show a gap. What they cannot do is commit a walk and later make
 * it disappear, or claim a walk they never committed. Absence is ambiguous here;
 * presence is not.
 *
 * Anyone can write bytes into a memo, including bytes that are not ours, so
 * every memo is validated rather than assumed.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { MEMO_PROGRAM_ID, type Attestation } from "./attest";
import { parseAttestationJson } from "./schema";

export type Walk = {
  signature: string;
  blockTime: number | null;
  attestation: Attestation;
};

export type WalkLog = {
  walks: Walk[];
  /** Transactions by this key that carried no walk attestation we could read. */
  skipped: number;
};

/**
 * Reads backwards from the most recent. `limit` bounds the RPC work: this runs
 * against a public devnet endpoint, and an unbounded scan of a busy key would
 * be rate-limited into failure.
 */
export async function fetchWalkLog(
  connection: Connection,
  walker: PublicKey,
  limit = 20,
): Promise<WalkLog> {
  const refs = await connection.getSignaturesForAddress(walker, { limit });
  const walks: Walk[] = [];
  let skipped = 0;

  for (const ref of refs) {
    if (ref.err) { skipped++; continue; }

    const tx = await connection.getTransaction(ref.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!tx) { skipped++; continue; }

    const keys = tx.transaction.message.getAccountKeys();
    const memoIx = tx.transaction.message.compiledInstructions.find(
      (ix) => keys.get(ix.programIdIndex)?.equals(MEMO_PROGRAM_ID),
    );
    if (!memoIx) { skipped++; continue; }

    // The key must have *signed* the memo, not merely appeared in the
    // transaction. Otherwise anyone could pad someone else's log by naming
    // their key as a read-only account.
    const signed = memoIx.accountKeyIndexes.some((i) => {
      const k = keys.get(i);
      return !!k && k.equals(walker);
    });
    if (!signed) { skipped++; continue; }

    const parsed = parseAttestationJson(new TextDecoder().decode(memoIx.data));
    if (!parsed.ok) { skipped++; continue; }

    walks.push({ signature: ref.signature, blockTime: ref.blockTime ?? null, attestation: parsed.value });
  }

  return { walks, skipped };
}

export type LogSummary = {
  walks: number;
  totalMetres: number;
  totalSeconds: number;
  simulated: number;
  /** Distinct dog names, in first-seen order. */
  dogs: string[];
};

/** Pure, so the arithmetic an owner reads is testable without a network. */
export function summarise(walks: Walk[]): LogSummary {
  const dogs: string[] = [];
  let totalMetres = 0;
  let totalSeconds = 0;
  let simulated = 0;

  for (const w of walks) {
    totalMetres += w.attestation.dist;
    totalSeconds += w.attestation.dur;
    if (w.attestation.sim === 1) simulated++;
    if (!dogs.includes(w.attestation.dog)) dogs.push(w.attestation.dog);
  }

  return { walks: walks.length, totalMetres, totalSeconds, simulated, dogs };
}
