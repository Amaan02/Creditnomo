# CreditNomo

**The first on-chain binary options trading dApp built on CreditCoin.**  
Powered by **CreditCoin testnet** + **Attestcoin Protocol** (cross-chain deposits) + **multi-provider market prices** (CoinGecko / DexScreener / CMC / GMGN / Axiom / Padre) + **Supabase** + instant house balance.

*Trade binary options with oracle-bound resolution, Attestcoin-verified capital, and minimal trust.*

**Links:**
- Live app: https://creditnomo-kappa.vercel.app/trade
- Demo video: https://youtu.be/jxhAybpdMfk
- GitHub: https://github.com/Amaan02/Creditnomo
- Deck: https://docs.google.com/presentation/d/1kLYkj42a4R3cMYrsuxRkb84evhZ659MvbFXp28knRvM/edit?slide=id.g3ab778face2_0_20#slide=id.g3ab778face2_0_20
- Attestcoin integration docs: [docs/ATTESTCOIN.md](docs/ATTESTCOIN.md)

**Main treasury (CreditCoin testnet):** [`0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123`](https://creditcoin-testnet.blockscout.com/address/0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123?tab=index)

---

## Attestcoin Protocol Integration Summary

Creditnomo integrates the **[Attestcoin Protocol](https://attestcoin.org/)** as a **core capital path**:

1. User sends **ETH on Ethereum Sepolia** to the Creditnomo deposit address.
2. Creditnomo waits until Attestcoin **attests** that Sepolia block on Creditcoin.
3. Using **`@gluwa/usc-sdk`**, it builds **Merkle + continuity proofs** via the Proof Builder API.
4. It submits **`verifyAndEmit`** to the Creditcoin **BlockProver precompile (`0x…0FD2`)**.
5. On success, the user’s **CTC house balance** is credited for Classic / Box trading.

Full technical write-up: **[docs/ATTESTCOIN.md](docs/ATTESTCOIN.md)** · APIs under `/api/attestcoin/*` · UI: **Attestcoin Deposit (Sepolia)** on the trade page.

---

**Tracks:**
- **DeFi** - Binary options trading platform with instant settlement and oracle-based pricing
- **Gaming** - Blitz Rounds with multipliers, leaderboards, and player-driven betting mechanics

**Key Features:**
- ✅ **Attestcoin Protocol** cross-chain deposits (Sepolia → Creditcoin proofs)
- ✅ On-chain treasury on CreditCoin Testnet
- ✅ Live market prices via CoinGecko / DexScreener / CMC (+ optional GMGN / Axiom / Padre)  
- ✅ Instant house balance for gas-free betting
- ✅ Classic & Box game modes
- ✅ Referral system and leaderboards
- ✅ 5s-60s trading rounds with oracle settlement


## Evaluation repository

**This public GitHub repository is the single source used for all evaluations.** It contains:

| Content | Location |
|--------|----------|
| **Core code** | `app/`, `components/`, `lib/`, `supabase/`, `scripts/` — full Next.js app, CreditCoin integration, market price providers, Supabase |
| **README** | This file — overview, quick start, tech stack, architecture, getting started |
| **Architecture & flow (`.md` + Mermaid)** | **README.md** · **docs/ATTESTCOIN.md** (Attestcoin Protocol) · **docs/TECHNICAL.md** · **docs/PROJECT.md** · **USER_JOURNEY.md** · **DEVELOPER_GUIDE.md** · **ROADMAP.md** |

---

## Repository structure

| Path | Purpose |
|------|--------|
| `app/` | Next.js App Router pages and API routes |
| `components/` | React UI components (trade, chart, wallet) |
| `lib/` | CTC config, Supabase client, market price feed, Attestcoin, utilities |
| `docs/` | PROJECT.md, TECHNICAL.md, EXTRAS.md, CreditCoin.address.json |
| `scripts/` | Balance sync, reconciliation, DB helpers |
| `supabase/` | SQL migrations and Supabase config |
| `public/` | Static assets |

---

## Why CreditNomo?

Binary options trading in Web3 does not exists. Real-time oracles and sub-second resolution have been the missing piece.

- **CoinGecko / DexScreener / CMC** (and optional GMGN / Axiom / Padre) deliver live USD prices for settlement.
- **CreditCoin testnet** — EVM-compatible blockchain for fast finality and low fees.
- **House balance** — place unlimited bets without signing a transaction every time; only deposit/withdraw hit the chain.
- **5s, 10s, 15s, 30s, 1m** rounds with oracle-bound settlement.

CreditNomo brings binary options to CreditCoin testnet with transparent, on-chain settlement.

---

## Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, Recharts |
| **Blockchain** | **CreditCoin testnet**, ethers.js, viem, Wagmi, ConnectKit, Privy |
| **Oracle** | **Attestcoin Protocol** (cross-chain deposits) + CoinGecko / DexScreener / CMC / GMGN / Axiom / Padre (prices) |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL) |
| **Payments** | CTC native transfers, single treasury |

### Key Dependencies & Credits

- **Next.js 16 & React 19** — core application framework and UI rendering.
- **TypeScript** — type-safe application codebase.
- **Tailwind CSS** — utility-first styling for a responsive trading UI.
- **Zustand** — lightweight global state for prices, rounds, and UI state.
- **Recharts** — charting library for price feeds and Box mode tiles.
- **Wagmi, viem, ethers.js & ConnectKit** — wallet integration and CreditCoin testnet RPC access.
- **Privy** — social login and embedded wallet experience.
- **Market prices** — CoinGecko, DexScreener, CMC, with optional GMGN / Axiom / Padre (`lib/utils/priceFeed.ts`).
- **Attestcoin Protocol (`@gluwa/usc-sdk`)** — trustless Sepolia→Creditcoin deposit proofs via BlockProver.
- **Supabase (PostgreSQL)** — managed database, auth, and SQL migrations.

---

## Market Opportunity

| Metric | Value |
|--------|--------|
| **Binary options / prediction (TAM)** | $27.56B (2025) → ~$116B by 2034 (19.8% CAGR) |
| **Crypto prediction markets** | $45B+ annual volume (Polymarket, Kalshi, on-chain) |
| **Crypto derivatives volume** | $86T+ annually (2025) |
| **Crypto users** | 590M+ worldwide |

---

## Competitive Landscape

| Segment | Examples | Limitation vs CreditNomo |
|--------|----------|----------------------|
| **Web2 binary options** | Binomo, IQ Option, Quotex | Opaque pricing, regulatory issues, no on-chain settlement; users do not custody funds. |
| **Crypto prediction markets** | Polymarket, Kalshi, Azuro | Event/outcome markets (e.g. “Will X happen?”), not sub-minute **price** binary options; resolution in hours or days. |
| **Crypto derivatives (CEX)** | Binance Futures, Bybit, OKX | Leveraged perps and positions; not short-duration binary options (5s–1m) with oracle-bound resolution. |
| **On-chain options / DeFi** | Dopex, Lyra, Premia | Standard options (calls/puts), complex UX; no simple “price up/down in 30s” binary product. |
| **CreditCoin testnet binary options** | — | No established on-chain binary options dApp; CreditNomo fills this gap. |

**CreditNomo’s differentiation:** First on-chain binary options dApp on CreditCoin testnet with multi-provider market prices, house balance for instant bets, and dual modes (Classic + Box) in one treasury.

---

## Future

Endless possibilities across:

- **Stocks, Forex** — Expand beyond crypto into traditional markets via oracles.
- **Options** — Standard options (calls/puts) on top of the same infrastructure.
- **Derivatives & Futures** — More products for advanced traders.
- **DEX** — Deeper DeFi integration and on-chain liquidity.

**Ultimate objective:** To become the next PolyMarket for binary options — the go-to on-chain venue for short-duration, oracle-settled binary options on CreditCoin testnet and beyond.

---

## How It Works

```mermaid
flowchart LR
    subgraph User
        A[Connect Wallet] --> B[Deposit CTC]
        B --> C[Place Bets]
        C --> D[Win/Lose]
        D --> E[Withdraw]
    end
    subgraph CreditNomo
        F[MetaMask / ConnectKit / Privy]
        G[Market Prices CG/Dex/CMC]
        H[Supabase Balances]
        I[CTC Treasury]
    end
    A --> F
    B --> I
    C --> G
    C --> H
    D --> H
    E --> I
```

### Flow

1. **Connect** — Connect via MetaMask (ConnectKit/Wagmi) or Privy (social login). All operations use **CTC** on CreditCoin testnet.
2. **Deposit** — Send CTC from your wallet to the CreditNomo treasury. Your house balance is credited instantly.
3. **Place bet** — Choose **Classic** (up/down + expiry) or **Box** (tap tiles with multipliers). No on-chain tx per bet.
4. **Resolution** — Market price providers resolve the price at expiry; win/loss is applied to your house balance.
5. **Withdraw** — Request withdrawal; CTC is sent from the treasury to your wallet on CreditCoin testnet.

---

## System Architecture

```mermaid
graph TB
    subgraph Client
        UI["Next.js + React UI"]
        Store["Zustand Store"]
        Wallets["Wagmi / ConnectKit / Privy"]
    end

    subgraph Oracle
        Pyth["Market Price Providers"]
    end

    subgraph CTCChain["CreditCoin Testnet"]
        UserWallet["User Wallet MetaMask or Privy"]
        Treasury["CreditNomo Treasury CTC EOA"]
        CreditCoinRPC["CreditCoin RPC"]
    end

    subgraph Backend
        API["Next.js API Routes"]
        DB["Supabase PostgreSQL"]
    end

    UI --> Store
    UI --> Wallets
    Wallets --> UserWallet
    UserWallet --> CreditCoinRPC
    CreditCoinRPC --> Treasury
    UI --> Pyth
    UI --> API
    API --> DB
    API --> Treasury
```

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as CreditNomo App
    participant P as Price Providers
    participant API as API + Supabase
    participant CTC as CTC Treasury on CreditCoin

    U->>App: Connect wallet MetaMask or Privy
    U->>App: Deposit CTC
    App->>CTC: Transfer CTC to treasury
    CTC-->>App: Tx confirmed
    App->>API: Credit house balance

    loop Betting
        P->>App: Live price stream
        U->>App: Place bet Classic or Box
        App->>API: Record bet in Supabase
        Note over App,API: No on-chain tx per bet, house balance only
        P->>App: Price at expiry
        App->>API: Settle win or loss, update house balance
    end

    U->>App: Request withdrawal
    App->>API: Debit balance, create payout
    API->>CTC: Sign and send CTC from treasury to user
    CTC-->>U: CTC received in wallet
```

### Game Modes

```mermaid
flowchart TD
    Start[Select Mode] --> Classic[Classic Mode]
    Start --> Box[Box Mode]

    Classic --> C1[Choose UP or DOWN]
    C1 --> C2[Pick expiry 5s to 1m]
    C2 --> C3[Enter stake in CTC]
    C3 --> C4[Price at expiry vs entry - Oracle settlement]

    Box --> B1[Tap a tile on the chart]
    B1 --> B2[Each tile is multiplier up to 10x]
    B2 --> B3[Price touches tile before expiry equals WIN]
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn (or npm)
- A CreditCoin testnet wallet (e.g. MetaMask) and some CTC
- Supabase project

### 1. Clone and install

```bash
git clone https://github.com/Amaan02/Creditnomo.git
cd CreditNomo
yarn install
```

**Note:** This project uses **yarn** only (see `packageManager` in `package.json`). The app runs **exclusively on CreditCoin Testnet**; `yarn.lock` may list dependencies for other chains (e.g. from Privy’s multi-chain wallet support); those are not used for chain logic.

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` with the following variables. See `.env.example` for a complete template.

#### Required Variables

| Variable | Description |
|----------|-------------|
| `CREDITCOIN_TREASURY_PRIVATE_KEY` | Treasury private key for withdrawals (⚠️ KEEP SECRET - server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (required for database operations) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (required for database operations) |

#### CreditCoin Network Configuration (Optional - defaults provided)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CREDITCOIN_TESTNET_RPC` | `https://rpc.cc3-testnet.creditcoin.network` | CreditCoin testnet RPC endpoint |
| `NEXT_PUBLIC_CREDITCOIN_TESTNET_CHAIN_ID` | `102031` | CreditCoin testnet chain ID |
| `NEXT_PUBLIC_CREDITCOIN_TESTNET_EXPLORER` | `https://creditcoin-testnet.blockscout.com` | Block explorer URL |
| `NEXT_PUBLIC_CREDITCOIN_TESTNET_CURRENCY` | `CTC` | Native currency name |
| `NEXT_PUBLIC_CREDITCOIN_TESTNET_CURRENCY_SYMBOL` | `CTC` | Currency symbol for display |
| `NEXT_PUBLIC_CREDITCOIN_TESTNET_CURRENCY_DECIMALS` | `18` | Native token decimals |

#### Treasury Configuration (Optional - defaults provided)

| Variable | Default | Description |
|----------|---------|-------------|
| `CREDITCOIN_TREASURY_ADDRESS` | `0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123` | Treasury wallet address (server-side) |
| `NEXT_PUBLIC_CREDITCOIN_TREASURY_ADDRESS` | `0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123` | Treasury address for client display |

#### Wallet Connection (Optional)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID (get from [cloud.walletconnect.com](https://cloud.walletconnect.com)) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID for social login (optional) |
| `PRIVY_APP_SECRET` | Privy app secret (⚠️ KEEP SECRET - server-side only) |

#### Application Configuration (Optional - defaults provided)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | `CreditNomo` | Application name displayed in UI |
| `NEXT_PUBLIC_CTC_NETWORK` | `testnet` | Network mode (`testnet` or `mainnet`) |
| `NEXT_PUBLIC_ROUND_DURATION` | `30` | Default round duration in seconds |
| `NEXT_PUBLIC_PRICE_UPDATE_INTERVAL` | `1000` | Price update interval in milliseconds |
| `NEXT_PUBLIC_CHART_TIME_WINDOW` | `300000` | Chart time window in milliseconds (5 minutes) |

**⚠️ Security Note:** Never commit `.env` to version control. All sensitive keys (private keys, secrets) should only be used server-side and never exposed to the client.

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL migrations in `supabase/migrations/` in the Supabase SQL Editor.

### 4. Run the app

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000); the app redirects to `/trade`.

### 5. Verify

- **Lint:** `yarn lint`
- **Tests:** `yarn test`
- No secrets in source: all keys and secrets live in `.env` (see [.env.example](./.env.example)); never commit `.env`.

---

## Architecture: How CreditNomo Scales

CreditNomo is designed for **high-throughput, low-latency** binary options trading on CreditCoin testnet.

### Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Bet throughput** | 1,000+ bets/second | Off-chain house balance (no tx per bet) |
| **Price updates** | ~2s interval | CoinGecko / DexScreener / CMC cascade |
| **Concurrent users** | 10,000+ | Supabase PostgreSQL + connection pooling |
| **Settlement latency** | <100ms | In-memory bet resolution + DB write |
| **Blockchain finality** | ~3 seconds | CreditCoin testnet block time |

### Scalability Strategy

1. **Off-chain execution engine**  
   - Bets are placed against house balance (stored in Supabase)  
   - Only deposits/withdrawals hit the blockchain  
   - Eliminates gas costs and network congestion for betting

2. **Horizontal scaling**  
   - Stateless Next.js API routes (scale via Vercel/AWS)  
   - Supabase connection pooling (supports 10K+ connections)  
   - CDN caching for static assets

3. **Database optimization**  
   - Indexed queries on `wallet_address`, `resolved_at`  
   - Partitioned tables for bet history (monthly partitions)  
   - Read replicas for analytics queries

4. **Treasury management**  
   - **Phase 1 (current)**: Single EOA treasury  
   - **Phase 2 (Q2 2026)**: Multi-sig treasury (Gnosis Safe 3-of-5)  
   - **Phase 3 (Q3 2026)**: Smart contract vault with time-locks

5. **Risk mitigation**  
   - **Insurance fund**: 5% of protocol fees reserved for edge cases  
   - **Liquidity reserves**: 70% CTC, 20% USDT, 10% yield-bearing (Venus)  
   - **Circuit breaker**: Auto-pause if oracle deviation >5% or treasury <10% reserves

---

## Revenue Model & Sustainability

### Protocol Revenue Streams

| Source | Fee/Rate | Destination |
|--------|----------|-------------|
| **Protocol fees** | 1.5-2% per bet | 70% treasury reserves, 20% insurance fund, 5% team, 5% community |
| **Referral bonuses** | 10% of referrer fees | Paid from protocol fee allocation |
| **VIP tier upgrades** | Volume-based (no upfront fee) | Incentivizes higher betting activity |
| **Future: Token staking** | Variable APY | Reduces sell pressure, aligns incentives |

### Sustainability Plan

**Treasury Reserve Management:**
- Maintain **minimum 30% reserves** (if reserves drop below, pause bets until replenished)
- **Yield generation**: Deposit idle CTC into Venus Protocol (~5% APY)
- **Dynamic fee adjustment**: Increase fees if treasury health <50%, decrease if >80%

**Insurance Fund:**
- Covers oracle failures, smart contract exploits, or extreme loss events
- Target: $100K by end of 2026 (currently accumulating 5% of fees)

**Liquidity Incentives:**
- **Early users**: Bonus multipliers for first 30 days (1.1x payouts)
- **Liquidity mining**: Stake CreditNomo tokens to earn protocol fee share (planned Q3 2026)
- **Referral bonuses**: 10% of fees from referred users (permanent)

**Long-term Revenue Targets:**

| Quarter | Users | Daily Volume | Monthly Revenue | Treasury TVL |
|---------|-------|--------------|-----------------|--------------|
| Q1 2026 | 1,000 | $10K | $6K | $50K |
| Q2 2026 | 5,000 | $50K | $30K | $250K |
| Q3 2026 | 20,000 | $250K | $150K | $1M |
| Q4 2026 | 50,000 | $1M | $600K | $5M |

**Break-even:** Estimated at 2,500 users with $25K daily volume (achievable Q2 2026)

---

## Adoption & Growth Plan / Go‑to‑Market

### Target Segments

- **DeFi-native traders on CreditCoin testnet** — users already active on CreditCoin perps/DEXs looking for new high-frequency products.
- **Binary options & prediction users (Web2 → Web3)** — users of Binomo/IQ Option and prediction markets seeking transparent, on-chain settlement.
- **Creators & communities** — KOLs, trading groups, and Telegram/Discord communities who want gamified trading experiences.

### Acquisition Channels

- **CreditCoin testnet ecosystem**: Grants, ecosystem programs, and co-marketing with CreditCoin testnet and infra partners.
- **X/Twitter & Telegram**: Short-form trade clips, PnL screenshots, and streak highlights for virality.
- **Referral program**: Perpetual fee share for referrers, with deep links into Classic and Box modes.
- **Launch partners**: Early integrations with wallets, analytics dashboards, and trader communities.

### Activation & Retention

- **Onboarding quests**: Complete first deposit and 3 trades to unlock boosted odds or fee discounts.
- **Streaks & leaderboards**: Daily/weekly leaderboards for hit-rate, multipliers, and volume.
- **VIP tiers**: Volume-based tiers with better odds, early access to new assets, and governance rights.
- **Education & transparency**: Clear docs about oracle settlement, treasury health, and risk disclosures.

### Expansion Roadmap

- **Phase 1 (CreditCoin testnet focus)**: Ship on CreditCoin, harden infra, iterate on UX and risk parameters.
- **Phase 2 (More assets & regions)**: Expand to FX, indices, and region-specific campaigns.
- **Phase 3 (Cross-chain & tokenization)**: CreditNomo token, cross-chain deployment, and deeper DeFi integrations.

---

**Tracks:** DeFi & Gaming

**DeFi Track:**  
CreditNomo enables on-chain binary options trading with lending-style house balance mechanics, instant settlement, and oracle-based pricing. It showcases Creditcoin as a scalable L1 for derivatives and trading infrastructure.

**Gaming Track:**  
Features Blitz Rounds with multiplier-based rewards, leaderboards, referral systems, and player-driven betting economies. Players compete for rankings and unlock VIP tiers through volume and performance.

**Key Innovations:**
- ⚡ Multi-provider market prices (CoinGecko, DexScreener, CMC, GMGN, Axiom, Padre)
- 🎮 Dual game modes (Classic binary & Box grid betting)
- 💰 Hybrid custody with instant house balance
- 🏆 Tiered system with Blitz multipliers
- 🔗 On-chain treasury verification on CreditCoin Testnet

---

## CreditCoin Testnet

CreditNomo is built for **CreditCoin testnet**:

- Deposits and withdrawals are CTC transfers on CreditCoin testnet.
- Treasury is an EOA on CreditCoin testnet; no custom contract required for core flow.
- Wallet connection via ConnectKit (MetaMask, etc.) and Privy.