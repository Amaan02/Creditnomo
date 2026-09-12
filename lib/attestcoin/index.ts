export {
  attestcoinConfig,
  ATTESTCOIN_BLOCK_PROVER,
  ATTESTCOIN_CHAIN_INFO,
  ATTESTCOIN_DECODER,
  SEPOLIA_CHAIN_KEY,
} from './config';

export {
  getSupportedAttestcoinChains,
  getSourceTxBlockNumber,
  isHeightAttested,
  waitForAttestation,
  generateAttestcoinProof,
  verifyProofOnCreditcoin,
  emitProofOnCreditcoin,
  proveAndVerifyTransaction,
  getAttestcoinPrecompileAddresses,
} from './client';

export {
  fetchAndValidateSepoliaDeposit,
  ethToCtcCredit,
  getAttestedDepositStatus,
  processAttestedDeposit,
} from './deposit';
