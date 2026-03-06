# Cross-Chain Yield Hunter — Frontend

Next.js 16 dashboard for visualizing yield opportunities and running scans.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **TypeScript**

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Features

- **Yield scan**: Fetches opportunities from DefiLlama via `/api/scan`
- **Table view**: Chain, protocol, symbol, APY, TVL
- **AI chat**: Ask questions about yields in natural language (e.g. "What's the best yield for $5k on Arbitrum?")
- **Dark theme**: Optimized for readability
- **Responsive**: Works on desktop and mobile

## AI Chat

For the "Ask AI" chat, add `OPENAI_API_KEY` to `.env.local` in the frontend directory. The chat uses current yield data to answer questions.
