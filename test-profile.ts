import { SolanaClient } from "./lib/solana";

const rpcs = ["https://api.mainnet-beta.solana.com", "https://rpc.ankr.com/solana"];
const client = new SolanaClient(rpcs);
const address = "A7UQbWX8GZkNBRQW9AmMgwa5dbdvt53mmmq9c1bgqVmU";

async function profile() {
  const t0 = Date.now();
  const sigs = await (client as any).getAllSignatures(address);
  console.log("signatures:", sigs.length, "in", ((Date.now() - t0) / 1000).toFixed(1), "s");

  const valid = sigs.filter((s: any) => !s.err);
  console.log("valid:", valid.length);

  const t1 = Date.now();
  const txs = await Promise.all(
    valid.slice(0, 10).map((s: any) => (client as any).getTransaction(s.signature).catch(() => null))
  );
  console.log("10 txs in", ((Date.now() - t1) / 1000).toFixed(1), "s");
  console.log("ok:", txs.filter(Boolean).length);
}

profile().catch((e) => console.error(e.message));
