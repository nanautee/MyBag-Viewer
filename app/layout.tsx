import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBV",
  description: "What your wallet would hold if every transaction was profit. Gross turnover — the sum of all money that ever moved through your address.",
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
