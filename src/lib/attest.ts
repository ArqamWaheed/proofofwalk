import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
} from "@solana/web3.js";
import type { Trace } from "./trace";
import { durationSeconds, hashTrace, totalMetres } from "./trace";

/** SPL Memo v2. https://www.solana-program.com/docs/memo */
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/** The program accepts up to 566 bytes of UTF-8 in a single unsigned memo. */
export const MEMO_MAX_BYTES = 566;

export type Attestation = {
  /** Schema version, so a reader in 2030 knows what these fields meant. */
  v: 1;
  dog: string;
  /** Unix seconds at the first fix. */
  t0: number;
  /** Seconds from first to last fix. */
  dur: number;
  /** Metres, noise-gated. */
  dist: number;
  /** Number of fixes, so a two-point "walk" is visible as one. */
  n: number;
  /** SHA-256 of the canonical trace. The trace itself never leaves the phone. */
  h: string;
};

export async function buildAttestation(trace: Trace): Promise<Attestation> {
  return {
    v: 1,
    dog: trace.dog,
    t0: trace.fixes[0]?.t ?? 0,
    dur: durationSeconds(trace.fixes),
    dist: totalMetres(trace.fixes),
    n: trace.fixes.length,
    h: await hashTrace(trace),
  };
}

export function encodeMemo(a: Attestation): string {
  const memo = JSON.stringify(a);
  const size = new TextEncoder().encode(memo).length;
  if (size > MEMO_MAX_BYTES) {
    // Only reachable via an absurd dog name; fail loudly rather than truncate
    // a record whose whole purpose is to be exact.
    throw new Error(`memo is ${size} bytes, over the ${MEMO_MAX_BYTES}-byte limit`);
  }
  return memo;
}

/**
 * The walker signs; the relayer pays.
 *
 * This split is the point. The Memo program logs the *verified signers* of the
 * instruction, so what lands on chain is "this key asserted this walk" — while
 * the fee comes from a relayer key the walker never holds. A walker therefore
 * needs no SOL, no wallet, and no crypto literacy, and still cannot produce an
 * attestation that someone else's key vouches for.
 */
export function buildWalkTransaction(
  walker: PublicKey,
  relayer: PublicKey,
  memo: string,
  recentBlockhash: string,
): Transaction {
  const tx = new Transaction({ feePayer: relayer, recentBlockhash });
  tx.add(
    new TransactionInstruction({
      // isSigner: true is what promotes the walker to a *verified* signer in the
      // program's log. Without it the memo is unattributed text.
      keys: [{ pubkey: walker, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, "utf8"),
    }),
  );
  return tx;
}

export async function readMemoFromTransaction(
  connection: Connection,
  signature: string,
): Promise<{ memo: string; blockTime: number | null; signers: string[] } | null> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) return null;

  const message = tx.transaction.message;
  const keys = message.getAccountKeys();
  const instructions = message.compiledInstructions;

  for (const ix of instructions) {
    const programId = keys.get(ix.programIdIndex);
    if (!programId?.equals(MEMO_PROGRAM_ID)) continue;
    return {
      memo: new TextDecoder().decode(ix.data),
      blockTime: tx.blockTime ?? null,
      signers: ix.accountKeyIndexes
        .map((i) => keys.get(i))
        .filter((k): k is PublicKey => !!k)
        .map((k) => k.toBase58()),
    };
  }
  return null;
}

/** Walker identity lives in the browser. Devnet, and deliberately disposable. */
const WALKER_KEY = "proof-of-walk.walker";

export function loadWalker(): Keypair {
  const stored = localStorage.getItem(WALKER_KEY);
  if (stored) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(stored)));
    } catch {
      // Corrupt entry — better to mint a fresh identity than to wedge the app.
    }
  }
  const kp = Keypair.generate();
  localStorage.setItem(WALKER_KEY, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}
