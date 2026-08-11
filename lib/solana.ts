import axios from "axios";
import type { WalletStats, TokenInfo } from "./types";

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result: any;
  error?: { code: number; message: string };
}

interface SignatureEntry {
  signature: string;
  blockTime: number | null;
  err: any;
}

interface TxResponse {
  slot: number;
  meta: {
    preBalances: number[];
    postBalances: number[];
    fee: number;
    err: any;
    loadedAddresses?: { writable: string[]; readonly: string[] };
    preTokenBalances?: any[];
    postTokenBalances?: any[];
  };
  transaction: {
    message: { accountKeys: string[] };
  };
  blockTime: number | null;
  error?: { code: number; message: string };
}

const SOL_PER_LAMPORT = 1e9;

export class SolanaClient {
  private rpcURLs: string[];
  private http = axios.create({ timeout: 8000 });

  constructor(rpcURLs: string[]) {
    this.rpcURLs = rpcURLs.length
      ? rpcURLs
      : [
          "https://solana-rpc.publicnode.com",
          "https://api.mainnet-beta.solana.com",
        ];
  }

  private async call(method: string, params: any[]): Promise<any> {
    const maxAttempts = this.rpcURLs.length * 3;
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const url = this.rpcURLs[attempt % this.rpcURLs.length];
      try {
        const { data } = await this.http.post<RpcResponse>(url, {
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        });
        if (data.error?.code === 429 || data.error?.message?.includes("Too many")) {
          lastErr = new Error(`429 on ${url}`);
          await this.sleep(400 * (attempt + 1));
          continue;
        }
        if (data.error) {
          throw new Error(
            `RPC error ${data.error.code}: ${data.error.message}`
          );
        }
        return data.result;
      } catch (err: any) {
        if (err.response?.status === 429 || err.message?.includes("429")) {
          lastErr = err;
          await this.sleep(400 * (attempt + 1));
          continue;
        }
        lastErr = err;
        await this.sleep(100);
      }
    }
    throw lastErr || new Error("All RPC endpoints failed");
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async getAllSignatures(
    address: string,
    preferredRPC?: string
  ): Promise<SignatureEntry[]> {
    const allSigs: SignatureEntry[] = [];
    let before: string | undefined;

    for (let page = 0; page < 10; page++) {
      const opts: any = { limit: 1000 };
      if (before) opts.before = before;
      let batch: any;
      if (preferredRPC) {
        try {
          const { data } = await this.http.post<RpcResponse>(preferredRPC, {
            jsonrpc: "2.0",
            id: 1,
            method: "getSignaturesForAddress",
            params: [address, opts],
          });
          batch = data.result;
        } catch {
          batch = await this.call("getSignaturesForAddress", [address, opts]);
        }
      } else {
        batch = await this.call("getSignaturesForAddress", [address, opts]);
      }
      if (!batch || batch.length === 0) break;
      allSigs.push(...batch);
      before = batch[batch.length - 1].signature;
      if (batch.length < 1000) break;
    }
    return allSigs;
  }

  private async getBalance(address: string): Promise<number> {
    const result = await this.call("getBalance", [address]);
    return result.value / SOL_PER_LAMPORT;
  }

  private async getTransactionParallel(
    sigs: string[]
  ): Promise<(TxResponse | null)[]> {
    const results: (TxResponse | null)[] = new Array(sigs.length).fill(null);
    const CONC = 20;
    const url = this.rpcURLs[0];

    for (let i = 0; i < sigs.length; i += CONC) {
      const chunk = sigs.slice(i, i + CONC);
      const responses = await Promise.all(
        chunk.map(async (sig) => {
          try {
            const { data } = await this.http.post<{
              jsonrpc: string;
              id: number;
              result?: TxResponse;
              error?: { code: number; message: string };
            }>(url, {
              jsonrpc: "2.0",
              id: 1,
              method: "getTransaction",
              params: [
                sig,
                { encoding: "json", maxSupportedTransactionVersion: 0 },
              ],
            });
            if (data.error) return null;
            return data.result || null;
          } catch {
            return null;
          }
        })
      );
      for (let k = 0; k < responses.length; k++) {
        results[i + k] = responses[k];
      }
    }

    return results;
  }

  private async getTokenAccounts(address: string): Promise<any> {
    return this.call("getTokenAccountsByOwner", [
      address,
      {
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      },
      { encoding: "jsonParsed" },
    ]);
  }

  async getWalletStats(
    address: string,
    tokenCA?: string
  ): Promise<WalletStats> {
    const [balance, allSigs] = await Promise.all([
      this.getBalance(address),
      this.getAllSignatures(
        address,
        "https://api.mainnet-beta.solana.com"
      ),
    ]);

    const validSigs = allSigs.filter((s) => !s.err);

    let totalSent = 0;
    let totalReceived = 0;
    let tokenBuy = 0;
    let tokenSell = 0;
    let tradeCount = 0;
    let firstTxTime: Date | null = null;
    let lastTxTime: Date | null = null;

    const sigs = validSigs.map((s) => s.signature);
    const MAX_LOAD = 200;
    const txs = await this.getTransactionParallel(sigs.slice(0, MAX_LOAD));

    for (const sig of validSigs) {
      if (!sig.blockTime) continue;
      const t = new Date(sig.blockTime * 1000);
      if (!firstTxTime || t < firstTxTime) firstTxTime = t;
      if (!lastTxTime || t > lastTxTime) lastTxTime = t;
    }

    for (let j = 0; j < txs.length; j++) {
      const tx = txs[j];
      if (!tx?.meta || tx.meta.err) continue;

      tradeCount++;

      const accountIdx = tx.transaction?.message?.accountKeys?.indexOf(address);
      if (accountIdx !== -1 && accountIdx < tx.meta.preBalances.length) {
        const pre = tx.meta.preBalances[accountIdx];
        const post = tx.meta.postBalances[accountIdx];
        if (pre > post) {
          totalSent += (pre - post) / SOL_PER_LAMPORT;
        } else if (post > pre) {
          totalReceived += (post - pre) / SOL_PER_LAMPORT;
        }
      }

      const preTok = tx.meta.preTokenBalances || [];
      const postTok = tx.meta.postTokenBalances || [];

      for (const t of postTok) {
        if (!t || t.owner !== address) continue;
        const preT = preTok.find(
          (p: any) => p && p.mint === t.mint && p.owner === address
        );
        const postAmt = parseFloat(t.uiTokenAmount?.uiAmountString || "0");
        const preAmt = preT
          ? parseFloat(preT.uiTokenAmount?.uiAmountString || "0")
          : 0;
        if (postAmt > preAmt) tokenBuy += postAmt - preAmt;
        else tokenSell += preAmt - postAmt;
      }
    }

    let tokenInfo: TokenInfo | null = null;

    try {
      const tokenAccounts = await this.getTokenAccounts(address);
      if (tokenAccounts?.value) {
        for (const ta of tokenAccounts.value) {
          const info = ta.account.data.parsed.info;
          if (tokenCA && info.mint !== tokenCA) continue;
          if (info.tokenAmount.uiAmount && info.tokenAmount.uiAmount > 0) {
            if (
              !tokenInfo ||
              parseFloat(info.tokenAmount.uiAmountString) >
                parseFloat(tokenInfo.balance)
            ) {
              tokenInfo = {
                symbol: info.mint.slice(0, 6),
                name: info.mint,
                balance: info.tokenAmount.uiAmountString,
                mint: info.mint,
                decimals: info.tokenAmount.decimals,
              };
            }
            if (tokenCA) break;
          }
        }
      }
    } catch {}

    return {
      address,
      chain: "solana",
      balance: balance.toFixed(9),
      total_sent: totalSent.toFixed(9),
      total_received: totalReceived.toFixed(9),
      gross_turnover: (totalSent + totalReceived).toFixed(9),
      tx_count: validSigs.length,
      processed_tx_count: tradeCount,
      token_volume: {
        buy: tokenBuy.toFixed(4),
        sell: tokenSell.toFixed(4),
        total: (tokenBuy + tokenSell).toFixed(4),
      },
      first_tx_time: firstTxTime?.toISOString() || null,
      last_tx_time: lastTxTime?.toISOString() || null,
      native_currency: "SOL",
      token: tokenInfo,
    };
  }

  async getTokenStats(mint: string): Promise<any> {
    const supply = await this.call("getTokenSupply", [mint]);
    const largest = await this.call("getTokenLargestAccounts", [mint]);
    return {
      mint,
      supply: supply.value,
      decimals: supply.decimals,
      largest_holders: largest.value
        ?.slice(0, 10)
        .map((h: any) => ({
          address: h.address,
          amount: h.uiAmountString,
        })),
    };
  }
}
