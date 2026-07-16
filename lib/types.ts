export interface WalletStats {
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
  token?: TokenInfo | null;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  balance: string;
  mint: string;
  decimals: number;
}

export interface WalletRequest {
  address: string;
  chain: "solana" | "ethereum" | "bsc" | "polygon";
  token_ca?: string;
}
