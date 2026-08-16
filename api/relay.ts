import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const MEMO_MAX_BYTES = 566;
const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

/** Comfortably above a signed one-memo transaction, far below anything abusive. */
const MAX_TX_BASE64 = 4_096;

function relayerKeypair(): Keypair {
  const raw = process.env.SOLANA_RELAYER_SECRET;
  if (!raw) throw new Error("SOLANA_RELAYER_SECRET is not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

/**
 * This endpoint pays for other people's transactions, so it verifies what it is
 * signing rather than trusting the client that sent it. A relayer that signs
 * whatever arrives is a faucet with extra steps: anyone could drain it by
 * feeding it transfers to their own account.
 *
 * The rules: exactly one instruction, addressed to the Memo program, no larger
 * than the program's own limit, and carrying at least one signer that is not us.
 */
function assertIsWalkAttestation(tx: Transaction, relayer: PublicKey): void {
  if (tx.instructions.length !== 1) {
    throw new Error(`expected 1 instruction, got ${tx.instructions.length}`);
  }
  const [ix] = tx.instructions;
  if (!ix.programId.equals(MEMO_PROGRAM_ID)) {
    throw new Error(`instruction targets ${ix.programId.toBase58()}, not the Memo program`);
  }
  if (ix.data.length > MEMO_MAX_BYTES) {
    throw new Error(`memo is ${ix.data.length} bytes, over the ${MEMO_MAX_BYTES}-byte limit`);
  }
  if (!tx.feePayer?.equals(relayer)) {
    throw new Error("fee payer is not the relayer");
  }
  // The whole value of the record is that a walker key vouched for it. A memo
  // signed only by the relayer asserts nothing about who took the walk.
  const walkerSigned = ix.keys.some((k) => k.isSigner && !k.pubkey.equals(relayer));
  if (!walkerSigned) throw new Error("no walker signature on the memo instruction");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { transaction } = req.body ?? {};
    if (typeof transaction !== "string") {
      return res.status(400).json({ error: "expected { transaction: base64 }" });
    }
    // A signed single-memo transaction is well under a kilobyte. Refusing
    // anything larger before decoding keeps an endpoint that spends money from
    // being asked to allocate megabytes on demand.
    if (transaction.length > MAX_TX_BASE64) {
      return res.status(413).json({ error: "transaction payload is too large" });
    }

    const relayer = relayerKeypair();
    const tx = Transaction.from(Buffer.from(transaction, "base64"));

    assertIsWalkAttestation(tx, relayer.publicKey);

    // partialSign preserves the walker's signature that arrived with the tx.
    tx.partialSign(relayer);

    const connection = new Connection(RPC, "confirmed");
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      preflightCommitment: "confirmed",
    });
    const bh = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight },
      "confirmed",
    );

    return res.status(200).json({ signature });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return res.status(400).json({ error: message });
  }
}
