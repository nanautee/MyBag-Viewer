import { Router, Request, Response, NextFunction } from "express";
import { SolanaClient } from "../clients/solana";
import { EvmClient } from "../clients/evm";
import { WalletRequest } from "../types";

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const solanaRPCs = (process.env.SOLANA_RPC_URLS || "https://api.mainnet-beta.solana.com")
  .split(",")
  .map((s) => s.trim());

const solanaClient = new SolanaClient(solanaRPCs);

router.post("/wallet", asyncHandler(async (req: Request, res: Response) => {
  const { address, chain, token_ca } = req.body as WalletRequest;

  if (!address || !chain) {
    res.status(400).json({ error: "address and chain are required" });
    return;
  }

  if (!["solana", "ethereum", "bsc", "polygon"].includes(chain)) {
    res.status(400).json({ error: "Unsupported chain" });
    return;
  }

  let stats;
  if (chain === "solana") {
    stats = await solanaClient.getWalletStats(address, token_ca);
  } else {
    const evmClient = new EvmClient(chain);
    stats = await evmClient.getWalletStats(address, token_ca);
  }
  res.json(stats);
}));

router.get("/token/:chain/:ca", asyncHandler(async (req: Request, res: Response) => {
  const { chain, ca } = req.params;

  if (chain === "solana") {
    const result = await solanaClient.getTokenStats(ca);
    res.json(result);
  } else {
    res.status(401).json({ error: "Token info not available via free API" });
  }
}));

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", version: "2.0.0" });
});

export default router;
