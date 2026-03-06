"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, RefreshCw, TrendingUp, ExternalLink, Sun, Moon, MessageCircle, Send, X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const CHAIN_LOGOS: Record<string, string> = {
  Ethereum:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  Polygon:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  Arbitrum:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  Optimism:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
  Base: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
  BSC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  Avalanche:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
};

const PROTOCOL_LOGOS: Record<string, string> = {
  "aave-v3": "https://icons.llama.fi/aave-v3.png",
  morpho: "https://icons.llama.fi/morpho-v1.png",
  euler: "https://icons.llama.fi/euler-v2.png",
  pendle: "https://icons.llama.fi/pendle.jpg",
  seamless: "https://icons.llama.fi/seamless-v2.jpg",
};

const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets";
const TOKEN_LOGOS: Record<string, string> = {
  USDC: `${TW}/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png`,
  DAI: `${TW}/0x6B175474E89094C44Da98b954Eedeac495271d0F/logo.png`,
  USDT: `${TW}/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
  USDT0: `${TW}/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
  USDTB: `${TW}/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
  APOLUSDC: `${TW}/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png`,
  APOLDAI: `${TW}/0x6B175474E89094C44Da98b954Eedeac495271d0F/logo.png`,
};

interface YieldOpportunity {
  poolId: string;
  chain: string;
  chainId: number;
  protocol: string;
  symbol: string;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number;
  vaultTokenAddress: string | null;
  project: string;
}

function formatTvl(tvl: number) {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
  return `$${tvl.toFixed(0)}`;
}

const CHAIN_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Ethereum: { bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-300", border: "border-slate-500/30" },
  Arbitrum: { bg: "bg-cyan-500/15", text: "text-cyan-600 dark:text-cyan-300", border: "border-cyan-500/30" },
  Base: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-300", border: "border-blue-500/30" },
  Optimism: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-300", border: "border-red-500/30" },
  Polygon: { bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-300", border: "border-violet-500/30" },
};

function getTokenLogo(symbol: string): string | null {
  const upper = symbol.toUpperCase();
  if (TOKEN_LOGOS[upper]) return TOKEN_LOGOS[upper];
  if (TOKEN_LOGOS[symbol]) return TOKEN_LOGOS[symbol];
  const base = upper.replace(/^A(POL|ARB|BAS)?/i, "").replace(/0$/, "");
  return TOKEN_LOGOS[base] ?? null;
}

function ChainBadge({ chain }: { chain: string }) {
  const style = CHAIN_STYLES[chain] ?? { bg: "bg-zinc-500/15", text: "text-zinc-600 dark:text-zinc-300", border: "border-zinc-500/30" };
  const logoSrc = CHAIN_LOGOS[chain];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium ${style.bg} ${style.text} ${style.border}`}
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={chain}
          width={18}
          height={18}
          className="rounded-full shrink-0 object-contain"
        />
      ) : (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold">
          {chain[0]}
        </span>
      )}
      {chain}
    </span>
  );
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  const logoSrc = PROTOCOL_LOGOS[protocol];

  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm font-mono">
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={protocol}
          width={18}
          height={18}
          className="shrink-0 rounded object-contain"
        />
      ) : (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded bg-current/10 text-[10px] font-bold">
          {protocol[0]}
        </span>
      )}
      {protocol}
    </span>
  );
}

function SymbolBadge({ symbol }: { symbol: string }) {
  const logoSrc = getTokenLogo(symbol);

  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--fg-muted)]">
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={symbol}
          width={20}
          height={20}
          className="shrink-0 rounded-full object-contain"
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[10px] font-medium">
          {symbol.slice(0, 2)}
        </span>
      )}
      {symbol}
    </span>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  async function handleChatSend() {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    setChatMessages((m) => [...m, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, opportunities }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Chat failed");
      setChatMessages((m) => [...m, { role: "assistant", content: json.answer }]);
    } catch (e) {
      setChatMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong. Make sure OPENAI_API_KEY is set in .env.local" },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleScan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Scan failed");
      setOpportunities(json.data ?? []);
      setLastScan(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      {/* Subtle ambient gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--accent)]/[0.04] blur-3xl" />
      </div>

      <header className="relative shrink-0 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm px-6 py-4">
        <div className="flex w-full items-center justify-between gap-4 max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-4"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <TrendingUp className="h-6 w-6 text-[var(--accent)]" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--fg)]">Cross-Chain Yield Hunter</h1>
              <p className="text-sm text-[var(--fg-muted)] mt-0.5">Powered by LI.FI · DefiLlama</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)]/80 border border-[var(--border)]" title="Supported chains">
              {(["Ethereum", "Polygon", "Arbitrum", "Base", "Optimism"] as const).map((chain) => (
                <div
                  key={chain}
                  className="flex h-7 w-7 items-center justify-center rounded-md overflow-hidden shrink-0"
                  title={chain}
                >
                  {CHAIN_LOGOS[chain] ? (
                    <Image
                      src={CHAIN_LOGOS[chain]}
                      alt={chain}
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-[9px] font-medium text-[var(--fg-dim)]">{chain[0]}</span>
                  )}
                </div>
              ))}
            </div>
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.button>
            <motion.button
              onClick={() => setChatOpen((o) => !o)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                chatOpen
                  ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              {chatOpen ? "Close chat" : "Ask AI"}
            </motion.button>
            <motion.a
              href="https://li.fi"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Docs
            </motion.a>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-6 py-6 transition-all duration-300 ${chatOpen ? "" : "max-w-[1600px] mx-auto w-full"}`}>
        <div className="flex w-full flex-1 flex-col gap-4 overflow-hidden">
          <motion.section
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex shrink-0 flex-wrap items-end justify-between gap-4 pb-4"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--fg)]">Yield Opportunities</h2>
              <p className="text-sm text-[var(--fg-muted)] mt-0.5">
                Morpho & Aave V3 · Ethereum, Arbitrum, Base, Optimism, Polygon
              </p>
            </div>
            <motion.button
              onClick={handleScan}
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.01 }}
              whileTap={loading ? {} : { scale: 0.99 }}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
                  Run scan
                </>
              )}
            </motion.button>
            <AnimatePresence mode="wait">
              {lastScan && !loading && (
                <motion.span
                  key="last"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[var(--fg-dim)] tabular-nums"
                >
                  Last scan {lastScan.toLocaleTimeString()}
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {error && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-500"
                >
                  {error}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.section>

          <div className="min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {opportunities.length > 0 ? (
                <motion.section
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full flex-col"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--fg-primary)]">
                      {opportunities.length} opportunities · sorted by APY
                    </span>
                  </div>
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
                  >
                    <div className="min-h-0 flex-1 overflow-auto">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] text-xs font-bold uppercase tracking-wider text-[var(--fg-primary)]">
                          <tr>
                            <th className="px-5 py-3.5 font-bold">Chain</th>
                            <th className="px-5 py-3.5 font-bold">Protocol</th>
                            <th className="px-5 py-3.5 font-bold">Symbol</th>
                            <th className="px-5 py-3.5 font-bold text-right">APY</th>
                            <th className="px-5 py-3.5 font-bold text-right">TVL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opportunities.map((opp) => (
                            <motion.tr
                              key={opp.poolId}
                              variants={item}
                              className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
                            >
                              <td className="px-5 py-3.5">
                                <ChainBadge chain={opp.chain} />
                              </td>
                              <td className="px-5 py-3.5">
                                <ProtocolBadge protocol={opp.protocol} />
                              </td>
                              <td className="px-5 py-3.5">
                                <SymbolBadge symbol={opp.symbol} />
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <span className="text-base font-semibold text-[var(--accent)] tabular-nums">
                                  {opp.apy.toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right text-sm text-[var(--fg-muted)] tabular-nums">
                                {formatTvl(opp.tvlUsd)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </motion.section>
              ) : (
<motion.section
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12"
              >
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]"
                >
                  <Search className="h-7 w-7 text-[var(--fg-dim)]" strokeWidth={1.5} />
                </motion.div>
                <p className="text-base font-medium text-[var(--fg-muted)]">
                  Run a scan to discover yield opportunities
                </p>
                <p className="mt-2 text-sm text-[var(--fg-dim)]">
                  Morpho & Aave V3 · LI.FI Composer
                </p>
              </motion.section>
              )}
            </AnimatePresence>
          </div>

          <footer className="shrink-0 border-t border-[var(--border)] pt-4 mt-2">
            <p className="text-xs text-[var(--fg-dim)]">
              CLI Agent: <code className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[11px]">npm run agent</code> <span className="text-[var(--fg-dim)]/60 mx-1">·</span> <code className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[11px]">npm run agent:dry</code>
            </p>
          </footer>
        </div>
      </main>

      {/* Chat sidebar - no overlay, dashboard shifts left */}
      <AnimatePresence>
        {chatOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="flex shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg)] overflow-hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="font-semibold text-[var(--fg)]">Ask about yields</span>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-[var(--fg-dim)]">
                    Ask anything about current yield opportunities. e.g. &quot;What&apos;s the best yield for $5k on Arbitrum?&quot;
                  </p>
                )}
                {chatMessages.map((msg, i) => {
                  const isConfigError = msg.role === "assistant" && msg.content.toLowerCase().includes("openai_api_key");
                  return (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          isConfigError
                            ? "border border-amber-500/30 bg-amber-500/10 text-[var(--fg-muted)]"
                            : msg.role === "user"
                              ? "bg-[var(--accent)] text-black"
                              : "bg-[var(--surface-hover)] text-[var(--fg)]"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-[var(--surface-hover)] px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--fg-dim)]" />
                    </div>
                  </div>
                )}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
              className="flex shrink-0 gap-2 border-t border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about yields..."
                className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)]"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
