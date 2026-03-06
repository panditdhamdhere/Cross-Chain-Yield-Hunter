# 🦎 Cross-Chain Yield Hunter

**Autonomous AI agent that hunts and rebalances into the best yields across chains using [LI.FI](https://li.fi).**

Built for the LI.FI Vibeathon — an agent that independently monitors yield rates, decides when to move capital, and executes cross-chain vault deposits via LI.FI Composer.

## Features

- **Autonomous decision loop**: Scan → Decide → Execute → Repeat
- **Cross-chain yield hunting**: Morpho, Aave V3, Euler, Pendle across Ethereum, Arbitrum, Base, Optimism, Polygon
- **LI.FI Composer**: Single atomic flow — bridge + vault deposit in one transaction
- **DefiLlama integration**: Real-time APY data for 15+ protocols
- **Production ready**: Structured logging, error handling, dry-run mode, configurable thresholds

## Quick Start

```bash
# Install (root)
npm install

# Copy env and add your wallet private key
cp .env.example .env

# One-time yield scan (no wallet needed)
npm run scan

# Run agent in dry-run (scan + decide, no execution)
npm run agent:dry

# Run agent (executes rebalances)
npm run agent
```

### Frontend Dashboard

```bash
# Install and run the Next.js dashboard
cd frontend && npm install && npm run dev
```

Then open http://localhost:3000 to view yield opportunities and run scans from the UI.

## Configuration

| Env | Default | Description |
|-----|---------|-------------|
| `PRIVATE_KEY` | — | **Required for run.** Wallet private key for signing |
| `LIFI_API_KEY` | — | Optional. Higher rate limits at [li.fi](https://li.fi) |
| `OPENAI_API_KEY` | — | Optional. Enables AI-powered decision logic. Without it, agent uses rule-based logic only |
| `MIN_APY_DIFFERENTIAL` | 1.5 | Min APY gain (%) to trigger rebalance |
| `MIN_POSITION_USD` | 1000 | Min position size (USD). Some DEXs require >$10k |
| `MAX_POSITION_USD` | 10000 | Max position per rebalance |
| `SCAN_INTERVAL_MINUTES` | 30 | Minutes between scans |
| `DRY_RUN` | true | If true, never execute (scan + decide only) |

## How It Works

1. **Scan**: Fetches yield data from DefiLlama for LI.FI Composer-supported protocols
2. **Decide**: Compares APYs, gets LI.FI quote for bridge cost, computes net APY gain. With `OPENAI_API_KEY`, an LLM augments the decision—it can approve rebalance or advise hold with reasoning
3. **Execute**: Uses LI.FI SDK to execute cross-chain vault deposit (bridge + deposit in one tx)
4. **Monitor**: Polls status until complete, then sleeps until next scan

## LI.FI Integration

- **REST API**: Quote fetching for decision logic
- **SDK**: `getQuote`, `convertQuoteToRoute`, `executeRoute` for execution
- **Composer**: Vault deposits (Morpho, Aave, etc.) as `toToken` in quote requests

## Project Structure

```
├── src/                  # Agent (CLI)
│   ├── index.ts          # CLI entry
│   ├── agent.ts          # Decision loop
│   ├── yieldScanner.ts   # DefiLlama → vault mapping
│   ├── lifiExecutor.ts   # LI.FI quotes + execution
│   └── ...
├── frontend/             # Next.js 16 dashboard
│   ├── src/app/          # App Router pages
│   ├── src/lib/          # Yield scanner for API
│   └── src/app/api/      # API routes
└── package.json
```

## Vibeathon Submission Checklist

- [x] **Working agent**: Scan → Decide → Execute loop with LI.FI
- [x] **LI.FI integration**: REST API for quotes + SDK for execution
- [x] **Composer**: Cross-chain vault deposits (bridge + deposit in one tx)
- [ ] **Video**: Screen record showing agent scan, decision, LI.FI execution
- [ ] **Post on X/LinkedIn**: Tag @lifiprotocol, include "I just built this with LI.FI's API for Agentic Commerce"

