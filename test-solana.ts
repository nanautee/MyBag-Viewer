import { SolanaClient } from "./lib/solana";

const rpcs = ["https://api.mainnet-beta.solana.com", "https://rpc.ankr.com/solana"];
const client = new SolanaClient(rpcs);
const address = "36a8Zq3hPBBDGF7UpSodVVzp8VxtV63zcKf32WyhzpjL";

const start = Date.now();

client
  .getWalletStats(address)
  .then((stats) => {
    console.log("DONE in", ((Date.now() - start) / 1000).toFixed(1), "s");
    console.log("balance:", stats.balance);
    console.log("turnover:", stats.gross_turnover);
    console.log("tx_count:", stats.tx_count);
  })
  .catch((err) => {
    console.log("FAILED in", ((Date.now() - start) / 1000).toFixed(1), "s");
    console.error(err.message);
  });
