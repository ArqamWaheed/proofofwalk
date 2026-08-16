export const RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const CLUSTER = "devnet";

export const explorerTx = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`;
