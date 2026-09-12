/**
 * Attestcoin Protocol configuration (Creditcoin CC3 Testnet)
 *
 * Docs: https://docs.attestcoin.org/
 * Environments: https://docs.attestcoin.org/attestcoin-protocol/attestcoin-protocol-chains-environments
 */

export const ATTESTCOIN_BLOCK_PROVER =
  '0x0000000000000000000000000000000000000FD2' as const;

export const ATTESTCOIN_CHAIN_INFO =
  '0x0000000000000000000000000000000000000fd3' as const;

export const ATTESTCOIN_DECODER =
  process.env.NEXT_PUBLIC_ATTESTCOIN_DECODER_ADDRESS ||
  '0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f';

/** Ethereum Sepolia chainKey on CC3 Testnet Attestcoin */
export const SEPOLIA_CHAIN_KEY = Number(
  process.env.NEXT_PUBLIC_ATTESTCOIN_SEPOLIA_CHAIN_KEY || 1
);

export const attestcoinConfig = {
  creditcoinRpcUrl:
    process.env.NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC ||
    'https://rpc.cc3-testnet.creditcoin.network',
  proofBuilderUrl:
    process.env.ATTESTCOIN_PROOF_BUILDER_URL ||
    process.env.NEXT_PUBLIC_ATTESTCOIN_PROOF_BUILDER_URL ||
    'https://proof-gen-api.cc3-testnet.creditcoin.network',
  dashboardUrl:
    process.env.NEXT_PUBLIC_ATTESTCOIN_DASHBOARD_URL ||
    'https://dashboard.cc3-testnet.creditcoin.network',
  sepoliaRpcUrl:
    process.env.SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    'https://ethereum-sepolia-rpc.publicnode.com',
  sepoliaChainId: 11155111,
  sepoliaChainKey: SEPOLIA_CHAIN_KEY,
  /** Address that receives ETH deposits on Sepolia for attested credit */
  sepoliaDepositAddress:
    process.env.NEXT_PUBLIC_SEPOLIA_DEPOSIT_ADDRESS ||
    process.env.NEXT_PUBLIC_CREDITCOIN_TREASURY_ADDRESS ||
    '0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123',
  /**
   * How many CTC house-balance units to credit per 1 ETH deposited on Sepolia.
   * Testnet demo rate — not a market price.
   */
  ethToCtcRate: Number(process.env.ATTESTCOIN_ETH_TO_CTC_RATE || 1000),
  /** Max wait for block attestation (ms) before asking the client to retry */
  attestationWaitMs: Number(process.env.ATTESTCOIN_ATTESTATION_WAIT_MS || 120_000),
  proofBuilderTimeoutMs: Number(process.env.ATTESTCOIN_PROOF_TIMEOUT_MS || 15_000),
};

export type AttestcoinConfig = typeof attestcoinConfig;
