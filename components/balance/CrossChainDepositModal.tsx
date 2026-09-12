'use client';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { parseEther, getAddress } from 'viem';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCreditnomoStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';

const SEPOLIA_CHAIN_ID = 11155111;

interface CrossChainDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amountCtc: number, txHash: string) => void;
}

type Step =
  | 'idle'
  | 'sending'
  | 'awaiting_attestation'
  | 'proving'
  | 'done'
  | 'error';

export const CrossChainDepositModal: React.FC<CrossChainDepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('0.01');
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string>('');
  const [ethToCtcRate, setEthToCtcRate] = useState(1000);
  const [result, setResult] = useState<{
    creditedCtc?: string;
    emitTxHash?: string;
  } | null>(null);

  const { address, fetchBalance } = useCreditnomoStore();
  const toast = useToast();
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const { wallets: privyWallets } = useWallets();
  const { authenticated } = usePrivy();

  useEffect(() => {
    if (!isOpen) {
      setStep('idle');
      setError(null);
      setStatusMsg(null);
      setTxHash('');
      setResult(null);
      return;
    }

    fetch('/api/attestcoin/chains')
      .then((r) => r.json())
      .then((data) => {
        if (data.sepoliaDepositAddress) setDepositAddress(data.sepoliaDepositAddress);
        if (data.ethToCtcRate) setEthToCtcRate(Number(data.ethToCtcRate));
      })
      .catch(() => {
        /* defaults from env / server */
      });
  }, [isOpen]);

  const estimatedCtc =
    amount && !Number.isNaN(parseFloat(amount))
      ? (parseFloat(amount) * ethToCtcRate).toFixed(4)
      : '0';

  const ensureSepolia = async () => {
    if (chainId === SEPOLIA_CHAIN_ID) return;
    if (switchChainAsync) {
      await switchChainAsync({ chainId: SEPOLIA_CHAIN_ID });
      return;
    }
    throw new Error('Please switch your wallet to Ethereum Sepolia');
  };

  const sendSepoliaDeposit = async (): Promise<string> => {
    if (!address) throw new Error('Connect your wallet first');
    if (!depositAddress) throw new Error('Sepolia deposit address not configured');
    const value = parseEther(amount || '0');
    if (value <= BigInt(0)) throw new Error('Enter an amount greater than 0');

    await ensureSepolia();
    const to = getAddress(depositAddress);

    if (wagmiConnected && wagmiAddress && wagmiWalletClient) {
      toast.info('Confirm Sepolia ETH transfer in your wallet…');
      return wagmiWalletClient.sendTransaction({ to, value, chainId: SEPOLIA_CHAIN_ID });
    }

    if (authenticated && privyWallets?.length) {
      const wallet = privyWallets.find(
        (w) => w.address.toLowerCase() === address.toLowerCase()
      );
      if (!wallet) throw new Error('Privy wallet not found');
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        await (ethereumProvider as any).request?.({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      }
      const signer = await provider.getSigner();
      toast.info('Confirm Sepolia ETH transfer in your wallet…');
      const tx = await signer.sendTransaction({ to, value });
      await tx.wait();
      return tx.hash;
    }

    throw new Error('Connect MetaMask or Privy to send on Sepolia');
  };

  const pollUntilReady = async (hash: string, user: string) => {
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `/api/attestcoin/status?txHash=${encodeURIComponent(hash)}&userAddress=${encodeURIComponent(user)}`
      );
      const data = await res.json();
      if (!data.success && data.error) {
        // keep polling if still indexing
        setStatusMsg(data.error);
      } else if (data.status === 'credited' || data.status === 'ready') {
        return data;
      } else {
        setStatusMsg(
          data.message ||
            `Awaiting Attestcoin attestation (attempt ${i + 1}/${maxAttempts})…`
        );
      }
      await new Promise((r) => setTimeout(r, 15000));
    }
    throw new Error('Timed out waiting for Attestcoin attestation. Retry with the same tx hash.');
  };

  const creditDeposit = async (hash: string) => {
    if (!address) throw new Error('Wallet not connected');
    setStep('proving');
    setStatusMsg('Generating Attestcoin proofs and verifyAndEmit on Creditcoin…');

    const res = await fetch('/api/attestcoin/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress: address, txHash: hash }),
    });
    const data = await res.json();

    if (!data.success) {
      if (data.awaitingAttestation) {
        setStep('awaiting_attestation');
        setStatusMsg(data.error);
        await pollUntilReady(hash, address);
        return creditDeposit(hash);
      }
      throw new Error(data.error || 'Attested deposit failed');
    }

    setResult({
      creditedCtc: data.creditedCtc,
      emitTxHash: data.creditcoinEmitTxHash,
    });
    setStep('done');
    await fetchBalance(address);
    const ctcNum = parseFloat(data.creditedCtc || '0');
    toast.success(
      `Attestcoin deposit credited: ${ctcNum.toFixed(4)} CTC house balance`
    );
    onSuccess?.(ctcNum, hash);
  };

  const handleSendAndProve = async () => {
    if (!address) {
      setError('Connect your wallet first');
      return;
    }
    try {
      setError(null);
      setStep('sending');
      const hash = await sendSepoliaDeposit();
      setTxHash(hash);
      setStep('awaiting_attestation');
      setStatusMsg('Sepolia tx sent. Waiting for Attestcoin attestation…');
      await pollUntilReady(hash, address);
      await creditDeposit(hash);
    } catch (err: any) {
      console.error(err);
      setStep('error');
      setError(err?.message || 'Cross-chain deposit failed');
      toast.error(err?.message || 'Cross-chain deposit failed');
    }
  };

  const handleProveExisting = async () => {
    if (!address) {
      setError('Connect your wallet first');
      return;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      setError('Enter a valid Sepolia transaction hash');
      return;
    }
    try {
      setError(null);
      setStep('awaiting_attestation');
      setStatusMsg('Checking Attestcoin attestation status…');
      await pollUntilReady(txHash, address);
      await creditDeposit(txHash);
    } catch (err: any) {
      console.error(err);
      setStep('error');
      setError(err?.message || 'Prove & credit failed');
      toast.error(err?.message || 'Prove & credit failed');
    }
  };

  const busy = ['sending', 'awaiting_attestation', 'proving'].includes(step);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attestcoin Cross-Chain Deposit"
      showCloseButton={!busy}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono">
            Attestcoin Protocol · Sepolia → Creditcoin
          </p>
          <p className="text-xs text-gray-300 leading-relaxed">
            Send ETH on <span className="text-white font-semibold">Sepolia</span>. Creditnomo
            waits for Attestcoin attestation, builds Merkle + continuity proofs, calls{' '}
            <span className="font-mono text-emerald-300">verifyAndEmit</span> on Creditcoin
            BlockProver (<span className="font-mono">0x…0FD2</span>), then credits your CTC
            house balance.
          </p>
          <p className="text-[10px] text-gray-400 font-mono break-all">
            Deposit address: {depositAddress || 'loading…'}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            Rate: 1 ETH → {ethToCtcRate} CTC (testnet)
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-gray-400 text-xs font-mono uppercase">
            Sepolia ETH amount
          </label>
          <input
            type="text"
            value={amount}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v);
            }}
            className="w-full px-4 py-3 bg-black/50 border border-emerald-500/30 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="0.01"
          />
          <p className="text-[10px] text-gray-400 font-mono">
            Est. credit ≈ {estimatedCtc} CTC
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-gray-400 text-xs font-mono uppercase">
            Or paste existing Sepolia tx hash
          </label>
          <input
            type="text"
            value={txHash}
            disabled={busy}
            onChange={(e) => setTxHash(e.target.value.trim())}
            className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="0x…"
          />
        </div>

        {statusMsg && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-300 font-mono">{statusMsg}</p>
            {step === 'awaiting_attestation' && (
              <p className="text-[10px] text-amber-400 mt-1 font-mono animate-pulse">
                Polling Attestcoin attestation…
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 space-y-1">
            <p className="text-xs text-emerald-300 font-mono">
              Credited {parseFloat(result.creditedCtc || '0').toFixed(4)} CTC
            </p>
            {result.emitTxHash && (
              <a
                href={`https://creditcoin-testnet.blockscout.com/tx/${result.emitTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-400 underline break-all font-mono"
              >
                Creditcoin emit tx: {result.emitTxHash}
              </a>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs font-mono">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button onClick={onClose} variant="secondary" className="flex-1" disabled={busy}>
            Close
          </Button>
          <Button
            onClick={handleProveExisting}
            variant="secondary"
            className="flex-1"
            disabled={busy || !txHash}
          >
            Prove & credit tx
          </Button>
          <Button
            onClick={handleSendAndProve}
            variant="primary"
            className="flex-1"
            disabled={busy || !amount || parseFloat(amount || '0') <= 0}
          >
            {busy ? 'Working…' : 'Send on Sepolia'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
