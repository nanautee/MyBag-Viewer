import { NextRequest, NextResponse } from "next/server";
import { SolanaClient } from "@/lib/solana";
import { EvmClient } from "@/lib/evm";

const solanaRPCs = (
  process.env.SOLANA_RPC_URLS ||
  "https://api.mainnet-beta.solana.com"
)
  .split(",")
  .map((s) => s.trim());

const solanaClient = new SolanaClient(solanaRPCs);

export async function POST(req: NextRequest) {
  try {
    const { address, chain, token_ca } = await req.json();

    if (!address || !chain) {
      return NextResponse.json(
        { error: "address and chain are required" },
        { status: 400 }
      );
    }

    if (
      !["solana", "ethereum", "bsc", "polygon"].includes(chain)
    ) {
      return NextResponse.json(
        { error: "Unsupported chain" },
        { status: 400 }
      );
    }

    let stats;
    if (chain === "solana") {
      stats = await solanaClient.getWalletStats(address, token_ca);
    } else {
      const evmClient = new EvmClient(chain);
      stats = await evmClient.getWalletStats(address, token_ca);
    }

    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json(
      { error: "internal_error", message: err.message },
      { status: 500 }
    );
  }
}
