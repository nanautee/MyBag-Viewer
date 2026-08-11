import axios from "axios";
import type { WalletStats, TokenInfo } from "./types";

interface BlockscoutTx {
  value: string;
  from: { hash: string };
  to: { hash: string };
  status: string;
  timestamp: string;
}

interface BlockscoutTxList {
  items: BlockscoutTx[];
  next_page_params: Record<string, any> | null;
}

const WEI = 1e18;

const CHAIN_CONFIG: Record<
  string,
  { apiBase: string; currency: string }
> = {
  ethereum: {
    apiBase: "https://eth.blockscout.com/api/v2",
    currency: "ETH",
  },
  bsc: {
    apiBase: "https://bsc.blockscout.com/api/v2",
    currency: "BNB",
  },
  polygon: {
    apiBase: "https://polygon.blockscout.com/api/v2",
    currency: "MATIC",
  },
};

export class EvmClient {
  private apiBase: string;
  private currency: string;
  private chain: string;
  private http = axios.create({ timeout: 8000 });

  constructor(chain: string) {
    const config = CHAIN_CONFIG[chain];
    if (!config) throw new Error(`Unsupported chain: ${chain}`);
    this.apiBase = config.apiBase;
    this.currency = config.currency;
    this.chain = chain;
  }

  private async getJSON<T>(url: string): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data } = await this.http.get<T>(url);
        return data;
      } catch (err: any) {
        if (err.response?.status === 429) {
          await this.sleep(2000 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Request failed after retries");
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async getWalletStats(
    address: string,
    tokenCA?: string
  ): Promise<WalletStats> {
    const addrData = await this.getJSON<{ coin_balance: string }>(
      `${this.apiBase}/addresses/${address}`
    );
    const balance = parseInt(addrData.coin_balance || "0") / WEI;
    const addrLower = address.toLowerCase();

    let totalSent = 0;
    let totalReceived = 0;
    let txCount = 0;
    let firstTxTime: Date | null = null;
    let lastTxTime: Date | null = null;

    if (!tokenCA) {
      let pageURL = `${this.apiBase}/addresses/${address}/transactions`;
      const maxPages = 10;

      for (let page = 0; page < maxPages; page++) {
        const txList =
          await this.getJSON<BlockscoutTxList>(pageURL);
        if (!txList.items?.length) break;

        for (const tx of txList.items) {
          if (tx.status !== "ok") continue;
          txCount++;

          const t = new Date(tx.timestamp);
          if (!firstTxTime || t < firstTxTime) firstTxTime = t;
          if (!lastTxTime || t > lastTxTime) lastTxTime = t;

          const value = parseFloat(tx.value) || 0;
          if (tx.from.hash.toLowerCase() === addrLower)
            totalSent += value;
          if (tx.to?.hash?.toLowerCase() === addrLower)
            totalReceived += value;
        }

        if (!txList.next_page_params) break;

        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(
          txList.next_page_params
        )) {
          params.set(k, String(v));
        }
        pageURL = `${this.apiBase}/addresses/${address}/transactions?${params.toString()}`;
        await this.sleep(500);
      }
    }

    let tokenInfo: TokenInfo | null = null;
    if (tokenCA) {
      try {
        const tokenURL = `${this.apiBase}/addresses/${address}/token-transfers?token=${tokenCA}`;
        const { data: transfers } = await this.http.get(tokenURL);

        let tokenBalance = 0;
        let tokenSymbol = "";
        let tokenName = "";
        let tokenDecimals = 18;

        if (transfers?.items) {
          for (const tr of transfers.items) {
            const fromAddr = tr.from?.hash?.toLowerCase();
            const toAddr = tr.to?.hash?.toLowerCase();
            const rawValue = parseFloat(
              tr.total?.value || tr.value || "0"
            );
            const decimals = parseInt(
              tr.token?.decimals || "18"
            );

            tokenSymbol =
              tr.token?.symbol || tokenCA.slice(0, 6);
            tokenName = tr.token?.name || tokenCA;
            tokenDecimals = decimals;

            if (toAddr === addrLower) tokenBalance += rawValue;
            if (fromAddr === addrLower)
              tokenBalance -= rawValue;

            const t = new Date(tr.timestamp);
            if (!firstTxTime || t < firstTxTime) firstTxTime = t;
            if (!lastTxTime || t > lastTxTime) lastTxTime = t;

            txCount++;
          }
        }

        tokenInfo = {
          symbol: tokenSymbol,
          name: tokenName,
          balance: String(tokenBalance),
          mint: tokenCA,
          decimals: tokenDecimals,
        };
      } catch {}
    }

    return {
      address,
      chain: this.chain,
      balance: balance.toFixed(18),
      total_sent: totalSent.toFixed(18),
      total_received: totalReceived.toFixed(18),
      gross_turnover: (totalSent + totalReceived).toFixed(18),
      tx_count: txCount,
      first_tx_time: firstTxTime?.toISOString() || null,
      last_tx_time: lastTxTime?.toISOString() || null,
      native_currency: this.currency,
      token: tokenInfo,
    };
  }
}
