import { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
const MEMO = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const c = new Connection('https://api.devnet.solana.com', 'confirmed');
const kp = Keypair.generate();
console.log('pubkey:', kp.publicKey.toBase58());
try {
  const sig = await c.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL);
  await c.confirmTransaction(sig, 'confirmed');
  console.log('airdrop OK');
} catch (e) { console.log('AIRDROP FAILED:', e.message); process.exit(1); }
const memo = JSON.stringify({ v:1, dog:'dog_01', st:1755340000, dur:1834, dist:2412, h:'a3f9'.repeat(16) });
console.log('memo bytes:', Buffer.byteLength(memo));
const tx = new Transaction().add(new TransactionInstruction({
  keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: true }],
  programId: MEMO, data: Buffer.from(memo, 'utf8'),
}));
const s = await sendAndConfirmTransaction(c, tx, [kp]);
console.log('MEMO TX OK:', s);
console.log('explorer: https://explorer.solana.com/tx/' + s + '?cluster=devnet');
