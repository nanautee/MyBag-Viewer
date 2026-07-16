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
  };
  transaction: {
    message: { accountKeys: string[] };
  };
  blockTime: number | null;
}

const SOL_PER_LAMPORT = 1e9;

export class SolanaClient {
  private rpcURLs: string[];
  private currentIndex = 0;
  private http = axios.create({ timeout: 30000 });

  constructor(rpcURLs: string[]) {
    this.rpcURLs = rpcURLs.length
      ? rpcURLs
      : ["https://api.mainnet-beta.solana.com"];
  }

  private nextURL(): string {
    const url = this.rpcURLs[this.currentIndex % this.rpcURLs.length];
    this.currentIndex++;
    return url;
  }

  private async call(method: string, params: any[]): Promise<any> {
    const maxAttempts = this.rpcURLs.length * 3;
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const url = this.nextURL();
      try {
        const { data } = await this.http.post<RpcResponse>(url, {
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        });
        if (data.error?.code === 429) {
          lastErr = new Error(`429 on ${url}`);
          await this.sleep(1000 * (attempt + 1));
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
          await this.sleep(1000 * (attempt + 1));
          continue;
        }
        lastErr = err;
        await this.sleep(500);
      }
    }
    throw lastErr || new Error("All RPC endpoints failed");
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async getAllSignatures(
    address: string
  ): Promise<SignatureEntry[]> {
    const allSigs: SignatureEntry[] = [];
    let before: string | undefined;

    while (true) {
      const opts: any = { limit: 1000 };
      if (before) opts.before = before;
      const batch = await this.call("getSignaturesForAddress", [
        address,
        opts,
      ]);
      if (!batch || batch.length === 0) break;
      allSigs.push(...batch);
      before = batch[batch.length - 1].signature;
      if (batch.length < 1000) break;
      await this.sleep(500);
    }
    return allSigs;
  }

  private async getBalance(address: string): Promise<number> {
    const result = await this.call("getBalance", [address]);
    return result.value / SOL_PER_LAMPORT;
  }

  private async getTransaction(sig: string): Promise<TxResponse | null> {
    return this.call("getTransaction", [
      sig,
      { encoding: "json", maxSupportedTransactionVersion: 0 },
    ]);
  }

  private async getTokenAccounts(address: string): Promise<any> {
    return this.call("getTokenAccountsByOwner", [
      address,
      {
        programId:
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      },
      { encoding: "jsonParsed" },
    ]);
  }

  async getWalletStats(
    address: string,
    tokenCA?: string
  ): Promise<WalletStats> {
    const balance = await this.getBalance(address);
    const allSigs = await this.getAllSignatures(address);

    const BATCH_SIZE = 5;
    const DELAY_MS = 1200;
    const MAX_TX = 200;

    let totalSent = 0;
    let totalReceived = 0;
    let txCount = 0;
    let firstTxTime: Date | null = null;
    let lastTxTime: Date | null = null;

    const validSigs = allSigs
      .filter((s) => !s.err)
      .slice(0, MAX_TX);

    for (let i = 0; i < validSigs.length; i += BATCH_SIZE) {
      const batch = validSigs.slice(i, i + BATCH_SIZE);
      const txs = await Promise.all(
        batch.map((s) =>
          this.getTransaction(s.signature).catch(() => null)
        )
      );

      for (let j = 0; j < txs.length; j++) {
        const tx = txs[j];
        const sig = batch[j];
        if (!tx?.meta || tx.meta.err) continue;
        if (!tx.transaction?.message?.accountKeys) continue;

        const accountIdx =
          tx.transaction.message.accountKeys.indexOf(address);
        if (
          accountIdx === -1 ||
          accountIdx >= tx.meta.preBalances.length
        )
          continue;

        txCount++;

        if (sig.blockTime) {
          const t = new Date(sig.blockTime * 1000);
          if (!firstTxTime || t < firstTxTime) firstTxTime = t;
          if (!lastTxTime || t > lastTxTime) lastTxTime = t;
        }

        const pre = tx.meta.preBalances[accountIdx];
        const post = tx.meta.postBalances[accountIdx];

        if (pre > post) {
          totalSent += (pre - post) / SOL_PER_LAMPORT;
        } else if (post > pre) {
          totalReceived += (post - pre) / SOL_PER_LAMPORT;
        }
      }

      if (i + BATCH_SIZE < validSigs.length) {
        await this.sleep(DELAY_MS);
      }
    }

    let tokenInfo: TokenInfo | null = null;

    try {
      const tokenAccounts = await this.getTokenAccounts(address);
      if (tokenAccounts?.value) {
        for (const ta of tokenAccounts.value) {
          const info = ta.account.data.parsed.info;
          if (tokenCA && info.mint !== tokenCA) continue;
          if (
            info.tokenAmount.uiAmount &&
            info.tokenAmount.uiAmount > 0
          ) {
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
      tx_count: txCount,
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
