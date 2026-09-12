-- Migration: Attestcoin Protocol cross-chain deposits
-- Stores Sepolia deposits that were proven via Attestcoin and credited on Creditcoin.

CREATE TABLE IF NOT EXISTS attestcoin_deposits (
  id SERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  sepolia_tx_hash TEXT NOT NULL UNIQUE,
  sepolia_block_number BIGINT NOT NULL,
  eth_amount NUMERIC(36, 18) NOT NULL,
  ctc_credited NUMERIC(36, 18) NOT NULL,
  chain_key INTEGER NOT NULL DEFAULT 1,
  creditcoin_emit_tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'credited',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestcoin_deposits_user
  ON attestcoin_deposits(user_address);

CREATE INDEX IF NOT EXISTS idx_attestcoin_deposits_created
  ON attestcoin_deposits(created_at DESC);

COMMENT ON TABLE attestcoin_deposits IS
  'Cross-chain deposits: Sepolia ETH transfers proven with Attestcoin Protocol and credited as CTC house balance';

ALTER TABLE attestcoin_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read attestcoin_deposits" ON attestcoin_deposits;
DROP POLICY IF EXISTS "Allow public insert attestcoin_deposits" ON attestcoin_deposits;

CREATE POLICY "Allow public read attestcoin_deposits"
ON attestcoin_deposits FOR SELECT USING (true);

CREATE POLICY "Allow public insert attestcoin_deposits"
ON attestcoin_deposits FOR INSERT WITH CHECK (true);
