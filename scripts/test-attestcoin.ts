/**
 * Attestcoin Protocol smoke test
 *
 * Usage:
 *   npx tsx scripts/test-attestcoin.ts
 *   SOURCE_CHAIN_TXN_HASH=0x... npx tsx scripts/test-attestcoin.ts
 */

try {
  // Optional: load .env if dotenv is present
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: '.env' });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: '.env.local' });
} catch {
  /* dotenv optional */
}

async function main() {
  const {
    getSupportedAttestcoinChains,
    getAttestcoinPrecompileAddresses,
    attestcoinConfig,
    proveAndVerifyTransaction,
  } = await import('../lib/attestcoin');

  console.log('=== Creditnomo · Attestcoin smoke test ===\n');
  console.log('Creditcoin RPC:', attestcoinConfig.creditcoinRpcUrl);
  console.log('Proof Builder:', attestcoinConfig.proofBuilderUrl);
  console.log('Sepolia deposit:', attestcoinConfig.sepoliaDepositAddress);
  console.log('Precompiles:', getAttestcoinPrecompileAddresses());
  console.log('');

  try {
    const chains = await getSupportedAttestcoinChains();
    console.log('Supported chains:', JSON.stringify(chains, null, 2));
  } catch (err) {
    console.warn('getSupportedChains failed (RPC may be slow):', err);
  }

  const txHash = process.env.SOURCE_CHAIN_TXN_HASH;
  if (!txHash) {
    console.log('\nNo SOURCE_CHAIN_TXN_HASH set — skipping prove/verify.');
    console.log('Set SOURCE_CHAIN_TXN_HASH=0x... to run full proveAndVerify.');
    process.exit(0);
  }

  console.log('\nProving tx:', txHash);
  const result = await proveAndVerifyTransaction(txHash, {
    emitOnChain: process.env.ATTESTCOIN_EMIT !== '0',
  });
  console.log('Result:', {
    verified: result.verified,
    blockNumber: result.blockNumber,
    chainKey: result.chainKey,
    emitTxHash: result.emitTxHash,
    headerNumber: result.proof.headerNumber,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
