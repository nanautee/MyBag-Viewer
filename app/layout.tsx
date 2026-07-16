import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBV",
  description: "Wallet gross turnover analyzer — Solana, Ethereum, BSC, Polygon",
  icons: { icon: "/logo.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="scanline" />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
