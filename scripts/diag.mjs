import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
const c = new Connection('https://api.devnet.solana.com', 'confirmed');
console.log('version:', JSON.stringify(await c.getVersion()));
console.log('slot:', await c.getSlot());
const bh = await c.getLatestBlockhash(); console.log('blockhash OK:', bh.blockhash.slice(0,12)+'...');
for (const amt of [1, 0.5, 0.1]) {
  const kp = Keypair.generate();
  try {
    const s = await c.requestAirdrop(kp.publicKey, amt*LAMPORTS_PER_SOL);
    console.log(`airdrop ${amt} SOL -> OK`, s.slice(0,16));
    break;
  } catch (e) { console.log(`airdrop ${amt} SOL -> FAIL:`, e.message.slice(0,90)); }
}
