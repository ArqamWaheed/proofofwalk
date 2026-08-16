import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Keypair } from "@solana/web3.js";

/**
 * Publishes the relayer's *public* key so the browser can name it as fee payer
 * when it builds the transaction. The secret stays in the environment.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const raw = process.env.SOLANA_RELAYER_SECRET;
  if (!raw) return res.status(500).json({ error: "relayer not configured" });
  try {
    const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    res.setHeader("cache-control", "public, max-age=300");
    return res.status(200).json({ relayer: kp.publicKey.toBase58() });
  } catch {
    return res.status(500).json({ error: "relayer key is malformed" });
  }
}
