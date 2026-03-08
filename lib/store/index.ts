/**
 * Main Zustand store for CREDITNOMO dApp
 * Combines wallet, game, and history slices
 * 
 * Note: After CreditCoin migration, blockchain events are handled
 * by the CTC backend client for deposit/withdrawal confirmation.
 * Game logic remains off-chain.
 */

import { create } from "zustand";
import { WalletState, createWalletSlice } from "./walletSlice";
import { GameState, createGameSlice, startPriceFeed, startGlobalPriceFeed } from "./gameSlice";
import { HistoryState, createHistorySlice, restoreBetHistory } from "./historySlice";
import { BalanceState, createBalanceSlice } from "./balanceSlice";
import { ReferralState, createReferralSlice } from "./referralSlice";
import { ProfileState, createProfileSlice } from "./profileSlice";

/**
 * Combined store type
 */
export type CreditnomoStore = WalletState & GameState & HistoryState & BalanceState & ReferralState & ProfileState;

/**
 * Create the main Zustand store
 * Combines all slices into a single store
 */
export const useCreditnomoStore = create<CreditnomoStore>()((...args) => ({
  ...createWalletSlice(...args),
  ...createGameSlice(...args),
  ...createHistorySlice(...args),
  ...createBalanceSlice(...args),
  ...createReferralSlice(...args),
  ...createProfileSlice(...args)
}));

/**
 * Initialize the store
 * Restores sessions, loads data
 * Should be called once on app initialization
 */
export const initializeStore = async (): Promise<void> => {
  const store = useCreditnomoStore.getState();

  try {
    // Restore bet history from localStorage
    restoreBetHistory((bets) => {
      useCreditnomoStore.setState({ bets });
    });

    // Load target cells
    await store.loadTargetCells();

    // Fetch house balance if wallet is connected
    if (store.address) {
      await store.fetchBalance(store.address);
    }

    // Start price feed polling
    const stopPriceFeed = store.startGlobalPriceFeed(store.updateAllPrices);

    // Store cleanup function for later use
    (window as any).__creditnomoCleanup = () => {
      stopPriceFeed();
    };


    console.log("CREDITNOMO store initialized successfully");
  } catch (error) {
    console.error("Error initializing store:", error);
  }
};

/**
 * Cleanup function
 * Stops price feed
 * Should be called when app is unmounted
 */
export const cleanupStore = (): void => {
  if ((window as any).__creditnomoCleanup) {
    (window as any).__creditnomoCleanup();
    delete (window as any).__creditnomoCleanup;
  }
};

/**
 * Export individual selectors for optimized re-renders
 */
export const useWalletAddress = () => useCreditnomoStore(state => state.address);
export const useWalletBalance = () => useCreditnomoStore(state => state.walletBalance);
export const useIsConnected = () => useCreditnomoStore(state => state.isConnected);
export const useCurrentPrice = () => useCreditnomoStore(state => state.currentPrice);
export const usePriceHistory = () => useCreditnomoStore(state => state.priceHistory);
export const useActiveRound = () => useCreditnomoStore(state => state.activeRound);
export const useTargetCells = () => useCreditnomoStore(state => state.targetCells);
export const useBetHistory = () => useCreditnomoStore(state => state.bets);
export const useIsPlacingBet = () => useCreditnomoStore(state => state.isPlacingBet);
export const useIsSettling = () => useCreditnomoStore(state => state.isSettling);
export const useHouseBalance = () => useCreditnomoStore(state => state.houseBalance);
export const useIsLoadingBalance = () => useCreditnomoStore(state => state.isLoading);
export const useUserTier = () => useCreditnomoStore(state => state.userTier);

/**
 * Export main store hook (alias for convenience)
 */
export const useStore = useCreditnomoStore;

/**
 * Export actions
 * Note: These selectors return new objects on each call, which can cause infinite loops.
 * Use direct store access (useCreditnomoStore(state => state.actionName)) instead.
 */
export const useWalletActions = () => {
  const connect = useCreditnomoStore(state => state.connect);
  const disconnect = useCreditnomoStore(state => state.disconnect);
  const refreshWalletBalance = useCreditnomoStore(state => state.refreshWalletBalance);
  return { connect, disconnect, refreshWalletBalance };
};

export const useGameActions = () => {
  const placeBet = useCreditnomoStore(state => state.placeBet);
  const placeBetFromHouseBalance = useCreditnomoStore(state => state.placeBetFromHouseBalance);
  const settleRound = useCreditnomoStore(state => state.settleRound);
  const updatePrice = useCreditnomoStore(state => state.updatePrice);
  return { placeBet, placeBetFromHouseBalance, settleRound, updatePrice };
};

export const useHistoryActions = () => {
  const fetchHistory = useCreditnomoStore(state => state.fetchHistory);
  const addBet = useCreditnomoStore(state => state.addBet);
  const clearHistory = useCreditnomoStore(state => state.clearHistory);
  return { fetchHistory, addBet, clearHistory };
};

export const useBalanceActions = () => {
  const fetchBalance = useCreditnomoStore(state => state.fetchBalance);
  const setBalance = useCreditnomoStore(state => state.setBalance);
  const updateBalance = useCreditnomoStore(state => state.updateBalance);
  const depositFunds = useCreditnomoStore(state => state.depositFunds);
  const withdrawFunds = useCreditnomoStore(state => state.withdrawFunds);
  const clearError = useCreditnomoStore(state => state.clearError);
  return { fetchBalance, setBalance, updateBalance, depositFunds, withdrawFunds, clearError };
};
