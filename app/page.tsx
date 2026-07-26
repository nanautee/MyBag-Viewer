"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const TOKEN_CA = "8Zf4KxKYZ6qUFxgEmepjvM6yuhegkzPFQySqTc7Ppump";
const TOKEN_NAME = "8Zf4Kx";
const TOKEN_SYMBOL = "8Zf4";
const TOKEN_CHAIN = "solana";

type View = "analyzer" | "ca" | "help";

interface WalletResult {
  address: string;
  chain: string;
  balance: string;
  total_sent: string;
  total_received: string;
  gross_turnover: string;
  tx_count: number;
  first_tx_time: string | null;
  last_tx_time: string | null;
  native_currency: string;
  token?: {
    symbol: string;
    name: string;
    balance: string;
    mint: string;
    decimals: number;
  } | null;
}

interface LogEntry {
  id: number;
  ts: string;
  html: string;
  cls?: string;
}

let logId = 0;

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

export default function Home() {
  const [view, setView] = useState<View>("analyzer");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<WalletResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("solana");
  const [headerCopied, setHeaderCopied] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback(
    (html: string, cls?: string) => {
      const entry: LogEntry = {
        id: ++logId,
        ts: now(),
        html,
        cls,
      };
      setLogs((prev) => [...prev, entry]);
    },
    []
  );

  const clearOutput = useCallback(() => {
    setLogs([]);
    setResult(null);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [logs, result]);

  useEffect(() => {
    if (view === "analyzer") inputRef.current?.focus();
  }, [view]);

  async function handleAnalyze() {
    const addr = address.trim();
    if (!addr) {
      addLog("ERROR: address is required", "err");
      return;
    }

    setLoading(true);
    clearOutput();
    addLog("─".repeat(44));
    addLog(
      `analyzing <span style="color:var(--cyan)">${addr.slice(0, 12)}...${addr.slice(-6)}</span> on ${chain}...`
    );
    addLog('fetching data... <span class="spinner"></span>');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 65000);

      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, chain }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setLogs((prev) => prev.slice(0, -1));
        addLog(`ERROR: ${data.message || data.error || "server error"}`, "err");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.error) {
        setLogs((prev) => prev.slice(0, -1));
        addLog(`ERROR: ${data.message || data.error}`, "err");
      } else {
        setLogs((prev) => prev.slice(0, -1));
        addLog('analysis complete <span class="ok">[OK]</span>');
        setResult(data);
      }
    } catch (err: any) {
      setLogs((prev) => prev.slice(0, -1));
      if (err.name === "AbortError") {
        addLog("ERROR: request timed out — wallet has too many transactions, try again", "err");
      } else {
        addLog(`ERROR: ${err.message}`, "err");
      }
    }

    setLoading(false);
    setAddress("");
  }

  function switchView(v: View) {
    setView(v);
    clearOutput();
    setAddress("");
  }

  const chainEmoji: Record<string, string> = {
    solana: "◎",
    ethereum: "◆",
    bsc: "⬡",
    polygon: "⬟",
  };

  const explorerUrls: Record<string, string> = {
    solana: `https://solscan.io/token/${TOKEN_CA}`,
    ethereum: `https://etherscan.io/token/${TOKEN_CA}`,
    bsc: `https://bscscan.com/token/${TOKEN_CA}`,
    polygon: `https://polygonscan.com/token/${TOKEN_CA}`,
  };

  const dexUrl = `https://dexscreener.com/${TOKEN_CHAIN}/${TOKEN_CA}`;
  const birdeyeUrl = `https://birdeye.so/token/${TOKEN_CA}?chain=${TOKEN_CHAIN}`;

  function handleCopyHeader() {
    copyText(TOKEN_CA);
    setHeaderCopied(true);
    setTimeout(() => setHeaderCopied(false), 2000);
  }

  function handleCopyResult() {
    copyText(TOKEN_CA);
    setResultCopied(true);
    setTimeout(() => setResultCopied(false), 2000);
  }

  return (
    <>
      <header>
        <div className="dots">
          <div className="dot r" />
          <div className="dot y" />
          <div className="dot g" />
        </div>
        <div className="title">
          MYBAG<span>_VIEWER</span> <span>v3.0</span>
        </div>
        <div className="header-spacer" />
        <button
          className={`btn-copy-header ${headerCopied ? "copied" : ""}`}
          onClick={handleCopyHeader}
        >
          <span className="label">{headerCopied ? "✓ COPIED" : "COPY CA"}</span>
          <span className="ca-val">
            {TOKEN_CA.slice(0, 6)}...{TOKEN_CA.slice(-4)}
          </span>
        </button>
      </header>

      <div className="container">
        <div className="sidebar">
          <div className="sidebar-header">// Modules</div>
          <div
            className={`sidebar-item ${view === "analyzer" ? "active" : ""}`}
            onClick={() => switchView("analyzer")}
          >
            <span className="icon">&gt;_</span> Wallet Analyzer
          </div>
          <div
            className={`sidebar-item ${view === "ca" ? "active" : ""}`}
            onClick={() => switchView("ca")}
          >
            <span className="icon">$</span> CA
          </div>
          <div
            className={`sidebar-item ${view === "help" ? "active" : ""}`}
            onClick={() => switchView("help")}
          >
            <span className="icon">?</span> Help
          </div>
          <div className="sidebar-version">
            <div>MyBag Viewer v3.0</div>
            <div style={{ marginTop: 4 }}>Solana / EVM</div>
          </div>
        </div>

        <div className="main">
          <div className="tabs">
            <div
              className={`tab ${view === "analyzer" ? "active" : ""}`}
              onClick={() => switchView("analyzer")}
            >
              ANALYZER
            </div>
            <div
              className={`tab ${view === "ca" ? "active" : ""}`}
              onClick={() => switchView("ca")}
            >
              CA
            </div>
            <div
              className={`tab ${view === "help" ? "active" : ""}`}
              onClick={() => switchView("help")}
            >
              MANUAL
            </div>
          </div>

          <div className="content" ref={contentRef}>
            {view === "analyzer" && (
              <>
                {logs.map((l) => (
                  <div key={l.id} className="log-entry">
                    <span className="ts">[{l.ts}]</span>{" "}
                    {l.cls ? (
                      <span
                        className={l.cls}
                        dangerouslySetInnerHTML={{ __html: l.html }}
                      />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: l.html }} />
                    )}
                  </div>
                ))}

                {result && (
                  <div className="result-box">
                    <div className="header">
                      <div className="header-left">
                        <span>
                          {chainEmoji[result.chain] || ">"}{" "}
                          {result.chain.toUpperCase()} WALLET REPORT
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        color: "var(--dim)",
                        fontSize: 11,
                        marginBottom: 16,
                        wordBreak: "break-all",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      address: {result.address}
                    </div>
                    <div className="stat-grid">
                      <div className="stat-item">
                        <div className="stat-label">Balance</div>
                        <div className="stat-value big">
                          {Number(result.balance).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          {result.native_currency}
                        </div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Gross Turnover</div>
                        <div className="stat-value big yellow">
                          {Number(result.gross_turnover).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 6 }
                          )}{" "}
                          {result.native_currency}
                        </div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Total Sent</div>
                        <div className="stat-value red">
                          {Number(result.total_sent).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          {result.native_currency}
                        </div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Total Received</div>
                        <div className="stat-value cyan">
                          {Number(result.total_received).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 6 }
                          )}{" "}
                          {result.native_currency}
                        </div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Transactions</div>
                        <div className="stat-value">{result.tx_count}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">First Tx</div>
                        <div className="stat-value" style={{ fontSize: 13 }}>
                          {result.first_tx_time
                            ? new Date(result.first_tx_time).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Last Tx</div>
                        <div className="stat-value" style={{ fontSize: 13 }}>
                          {result.last_tx_time
                            ? new Date(result.last_tx_time).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </div>
                    </div>

                    {result.token && (
                      <div className="token-box">
                        <div className="tag">TOKEN</div>
                        <div className="stat-grid">
                          <div className="stat-item">
                            <div className="stat-label">Symbol</div>
                            <div className="stat-value cyan">
                              {result.token.symbol}
                            </div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">Balance</div>
                            <div className="stat-value">
                              {Number(result.token.balance).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 4 }
                              )}
                            </div>
                          </div>
                          <div className="stat-item" style={{ gridColumn: "span 2" }}>
                            <div className="stat-label">Contract</div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginTop: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--dim)",
                                  wordBreak: "break-all",
                                }}
                              >
                                {result.token.mint}
                              </span>
                              <button
                                className="btn-copy"
                                onClick={() => copyText(result.token!.mint)}
                              >
                                COPY CA
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {logs.length === 0 && !result && (
                  <>
                    <div className="fancy-line">{"─".repeat(44)}</div>
                    <div className="log-entry">
                      <span className="ts">[sys]</span>{" "}
                      <span className="ok">system ready</span> — enter wallet
                      address to analyze
                    </div>
                    <div className="fancy-line">{"─".repeat(44)}</div>
                  </>
                )}
              </>
            )}

            {view === "ca" && (
              <div className="result-box">
                <div className="ca-showcase">
                  <div className="token-name">{TOKEN_NAME}</div>
                  <div className="token-symbol">{TOKEN_SYMBOL}</div>
                  <div className="divider" />
                  <div className="ca-address">
                    <span className="ca-text">{TOKEN_CA}</span>
                    <button
                      className={`btn-copy ${resultCopied ? "copied" : ""}`}
                      onClick={handleCopyResult}
                    >
                      {resultCopied ? "✓ COPIED" : "COPY CA"}
                    </button>
                  </div>
                  <div className="divider" />
                  <div
                    style={{
                      color: "var(--dim)",
                      fontSize: 11,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Links
                  </div>
                  <div className="links">
                    <a
                      className="link-btn"
                      href={dexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DEX Screener
                    </a>
                    <a
                      className="link-btn"
                      href={birdeyeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Birdeye
                    </a>
                    <a
                      className="link-btn"
                      href={explorerUrls[TOKEN_CHAIN]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Explorer
                    </a>
                  </div>
                </div>
              </div>
            )}

            {view === "help" && (
              <div className="result-box">
                <div className="header">
                  <span>MANUAL</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  <div>
                    <span className="ok">&gt;_</span>{" "}
                    <b>Wallet Analyzer</b> — analyze any wallet&apos;s gross turnover
                  </div>
                  <div style={{ color: "var(--dim)" }}>
                    {"──────────────────────────────────"}
                  </div>
                  <div>
                    <span className="info">1.</span> Select chain from dropdown
                  </div>
                  <div>
                    <span className="info">2.</span> Paste wallet address
                  </div>
                  <div>
                    <span className="info">3.</span> Click{" "}
                    <span className="ok">ANALYZE</span>
                  </div>
                  <div style={{ color: "var(--dim)" }}>
                    {"──────────────────────────────────"}
                  </div>
                  <div>
                    <span className="warn">Supported chains:</span>
                  </div>
                  <div>
                    ◎ Solana &nbsp; ◆ Ethereum &nbsp; ⬡ BSC &nbsp; ⬟ Polygon
                  </div>
                  <div style={{ color: "var(--dim)" }}>
                    {"──────────────────────────────────"}
                  </div>
                  <div>
                    <span className="warn">CA tab:</span>
                  </div>
                  <div>View token info and quick links</div>
                  <div>
                    Use{" "}
                    <span className="ok">COPY CA</span> button in header to copy
                    address
                  </div>
                  <div style={{ color: "var(--dim)" }}>
                    {"──────────────────────────────────"}
                  </div>
                  <div style={{ color: "var(--dim)" }}>
                    API: POST /api/wallet &nbsp; | &nbsp; GET
                    /api/token/:chain/:ca
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className={`input-area ${view !== "analyzer" ? "hidden" : ""}`}
          >
            <span className="prompt">wallet@analyzer ~&gt;</span>
            <select value={chain} onChange={(e) => setChain(e.target.value)}>
              <option value="solana">Solana</option>
              <option value="ethereum">Ethereum</option>
              <option value="bsc">BSC</option>
              <option value="polygon">Polygon</option>
            </select>
            <input
              ref={inputRef}
              type="text"
              placeholder="enter wallet address..."
              autoComplete="off"
              spellCheck={false}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAnalyze();
              }}
            />
            <button
              className="action-btn"
              disabled={loading}
              onClick={handleAnalyze}
            >
              {loading ? <span className="spinner" /> : "ANALYZE"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
