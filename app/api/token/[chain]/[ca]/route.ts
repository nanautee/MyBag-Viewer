import { NextRequest, NextResponse } from "next/server";
import { SolanaClient } from "@/lib/solana";

const solanaRPCs = (
  process.env.SOLANA_RPC_URLS ||
  "https://api.mainnet-beta.solana.com"
)
  .split(",")
  .map((s) => s.trim());

const solanaClient = new SolanaClient(solanaRPCs);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chain: string; ca: string }> }
) {
  try {
    const { chain, ca } = await params;

    if (chain === "solana") {
      const result = await solanaClient.getTokenStats(ca);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Token info not available via free API" },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "internal_error", message: err.message },
      { status: 500 }
    );
  }
}
