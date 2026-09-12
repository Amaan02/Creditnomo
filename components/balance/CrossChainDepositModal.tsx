'use client';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { parseEther, getAddress, type Hex } from 'viem';
import { useAccount, useSwitchChain } from 'wagmi';
import { getWalletClient } from '@wagmi/core';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCreditnomoStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';
import { config as wagmiConfig } from '@/lib/ctc/wagmi';

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_HEX = '0xaa36a7';

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

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/chain.*match|target chain|Current Chain ID/i.test(raw)) {
    return 'Wallet is still on CreditCoin. Approve the switch to Ethereum Sepolia, then tap Send again.';
  }
  if (/user rejected|denied|rejected the request/i.test(raw)) {
    return 'Transaction rejected in wallet.';
  }
  // Keep toast readable — truncate viem dumps
  return raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
}

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
      .catch(() => {});
  }, [isOpen]);

  const estimatedCtc =
    amount && !Number.isNaN(parseFloat(amount))
      ? (parseFloat(amount) * ethToCtcRate).toFixed(4)
      : '0';

  const ensureSepolia = async () => {
    // Prefer injected provider switch (most reliable with MetaMask)
    const eth = (typeof window !== 'undefined' ? (window as any).ethereum : null) as
      | { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      | undefined;

    if (eth?.request) {
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_HEX }],
        });
        return;
      } catch (switchErr: any) {
        // 4902 = chain not added
        if (switchErr?.code === 4902) {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_HEX,
                chainName: 'Sepolia',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          return;
        }
        // fall through to wagmi
      }
    }

    if (chainId === SEPOLIA_CHAIN_ID) return;
    if (switchChainAsync) {
      await switchChainAsync({ chainId: SEPOLIA_CHAIN_ID });
      // Give wagmi a beat to refresh the client chain
      await new Promise((r) => setTimeout(r, 400));
      return;
    }
    throw new Error('Please switch your wallet to Ethereum Sepolia (11155111)');
  };

  const sendSepoliaDeposit = async (): Promise<string> => {
    if (!address) throw new Error('Connect your wallet first');
    if (!depositAddress) throw new Error('Sepolia deposit address not configured');
    const value = parseEther(amount || '0');
    if (value <= BigInt(0)) throw new Error('Enter an amount greater than 0');

    await ensureSepolia();
    const to = getAddress(depositAddress);

    // Path 1: ethers via injected provider on Sepolia (avoids stale wagmi chainId)
    const eth = (typeof window !== 'undefined' ? (window as any).ethereum : null) as
      | { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      | undefined;
    if (eth?.request) {
      const provider = new ethers.BrowserProvider(eth as any);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        throw new Error(
          'Still not on Sepolia after switch. Open MetaMask → switch network to Sepolia → try again.'
        );
      }
      toast.info('Confirm Sepolia ETH transfer in your wallet…');
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({ to, value });
      setStatusMsg(`Submitted ${tx.hash.slice(0, 10)}… waiting for confirmation`);
      await tx.wait();
      return tx.hash;
    }

    // Path 2: wagmi wallet client forced to Sepolia
    if (wagmiConnected && wagmiAddress) {
      const client = await getWalletClient(wagmiConfig, { chainId: SEPOLIA_CHAIN_ID });
      if (!client) throw new Error('Wallet client unavailable for Sepolia');
      toast.info('Confirm Sepolia ETH transfer in your wallet…');
      const hash = await (client as any).sendTransaction({
        to,
        value,
        chainId: SEPOLIA_CHAIN_ID,
      });
      return hash as Hex;
    }

    // Path 3: Privy embedded
    if (authenticated && privyWallets?.length) {
      const wallet = privyWallets.find(
        (w) => w.address.toLowerCase() === address.toLowerCase()
      );
      if (!wallet) throw new Error('Privy wallet not found');
      const ethereumProvider = await wallet.getEthereumProvider();
      await (ethereumProvider as any).request?.({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_HEX }],
      });
      const provider = new ethers.BrowserProvider(ethereumProvider);
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
    toast.success(`Attestcoin deposit credited: ${ctcNum.toFixed(4)} CTC`);
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
      setStatusMsg('Switching wallet to Sepolia…');
      const hash = await sendSepoliaDeposit();
      setTxHash(hash);
      setStep('awaiting_attestation');
      setStatusMsg('Sepolia tx sent. Waiting for Attestcoin attestation…');
      await pollUntilReady(hash, address);
      await creditDeposit(hash);
    } catch (err: any) {
      console.error(err);
      setStep('error');
      const msg = friendlyError(err);
      setError(msg);
      toast.error(msg);
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
      const msg = friendlyError(err);
      setError(msg);
      toast.error(msg);
    }
  };

  const busy = ['sending', 'awaiting_attestation', 'proving'].includes(step);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attestcoin · Sepolia → Creditcoin"
      showCloseButton={!busy}
      size="md"
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono">
            Cross-chain deposit
          </p>
          <p className="text-xs text-gray-300 leading-snug">
            Send ETH on <span className="text-white font-semibold">Sepolia</span>, then we
            prove it with Attestcoin (<span className="font-mono text-emerald-300">verifyAndEmit</span>) and credit CTC.
          </p>
          <p className="text-[10px] text-gray-500 font-mono break-all">
            To: {depositAddress || '…'}
          </p>
          <p className="text-[10px] text-gray-500 font-mono">
            Rate 1 ETH → {ethToCtcRate} CTC · est. {estimatedCtc} CTC
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-400 text-[10px] font-mono uppercase">
            Sepolia ETH amount
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v);
            }}
            className="w-full px-3 py-2.5 bg-black/50 border border-emerald-500/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="0.01"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-400 text-[10px] font-mono uppercase">
            Or paste Sepolia tx hash
          </label>
          <input
            type="text"
            value={txHash}
            disabled={busy}
            onChange={(e) => setTxHash(e.target.value.trim())}
            className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-[11px] text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="0x…"
          />
        </div>

        {statusMsg && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[11px] text-gray-300 font-mono break-words">{statusMsg}</p>
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
                Emit tx: {result.emitTxHash}
              </a>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/60 rounded-lg px-3 py-2 max-h-28 overflow-y-auto">
            <p className="text-red-400 text-[11px] font-mono break-words whitespace-pre-wrap">
              {error}
            </p>
          </div>
        )}

        {/* Stacked actions — fits phone width */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            onClick={handleSendAndProve}
            variant="primary"
            className="w-full"
            disabled={busy || !amount || parseFloat(amount || '0') <= 0}
          >
            {busy && step === 'sending'
              ? 'Switching / sending…'
              : busy
                ? 'Working…'
                : '1. Send ETH on Sepolia'}
          </Button>
          <Button
            onClick={handleProveExisting}
            variant="secondary"
            className="w-full"
            disabled={busy || !txHash}
          >
            2. Prove & credit existing tx
          </Button>
          <Button onClick={onClose} variant="secondary" className="w-full" disabled={busy}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
