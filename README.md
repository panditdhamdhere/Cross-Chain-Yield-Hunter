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

Then open http://localhost:3000 to view yield opportunities, run scans, and use the AI chat. Add `GROQ_API_KEY` (free at console.groq.com) or `OPENAI_API_KEY` to `frontend/.env.local` for the chat.

## Configuration

| Env | Default | Description |
|-----|---------|-------------|
| `PRIVATE_KEY` | — | **Required for run.** Wallet private key for signing |
| `LIFI_API_KEY` | — | Optional. Higher rate limits at [li.fi](https://li.fi) |
| `GROQ_API_KEY` | — | Optional, **free**. AI for decision logic & chat. Get at [console.groq.com](https://console.groq.com) |
| `OPENAI_API_KEY` | — | Optional. Alternative to Groq for AI |
| `MIN_APY_DIFFERENTIAL` | 1.5 | Min APY gain (%) to trigger rebalance |
| `MIN_POSITION_USD` | 1000 | Min position size (USD). Some DEXs require >$10k |
| `MAX_POSITION_USD` | 10000 | Max position per rebalance |
| `SCAN_INTERVAL_MINUTES` | 30 | Minutes between scans |
| `DRY_RUN` | true | If true, never execute (scan + decide only) |

## How It Works

1. **Scan**: Fetches yield data from DefiLlama for LI.FI Composer-supported protocols
2. **Decide**: Compares APYs, gets LI.FI quote for bridge cost, computes net APY gain. With `GROQ_API_KEY` or `OPENAI_API_KEY`, an LLM augments the decision—it can approve rebalance or advise hold with reasoning
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

## Deploy to Render (Agent)

To run the agent 24/7 as a background worker:

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → New → Blueprint
3. Connect your repo — Render will detect `render.yaml` and create the worker
4. **If you created the service manually:** Ensure **Root Directory** is blank (repo root). Wrong root (e.g. `src`) causes `MODULE_NOT_FOUND` for `dist/index.js`
5. Set environment variables in Render:
   - `PRIVATE_KEY` (required) — wallet private key for signing
   - `LIFI_API_KEY` (optional) — higher rate limits
   - `GROQ_API_KEY` or `OPENAI_API_KEY` (optional) — for AI decisions
   - `DRY_RUN` — set to `false` to execute real transactions
5. Deploy

The agent will run continuously: scan → decide → execute on the configured interval.

## Vibeathon Submission Checklist

- [x] **Working agent**: Scan → Decide → Execute loop with LI.FI
- [x] **LI.FI integration**: REST API for quotes + SDK for execution
- [x] **Composer**: Cross-chain vault deposits (bridge + deposit in one tx)
- [ ] **Video**: Screen record showing agent scan, decision, LI.FI execution
- [ ] **Post on X/LinkedIn**: Tag @lifiprotocol, include "I just built this with LI.FI's API for Agentic Commerce"

