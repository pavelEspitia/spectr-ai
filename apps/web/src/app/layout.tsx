import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "spectr-ai — Smart Contract Security Analyzer",
  description:
    "AI-powered security analysis for Solidity and Vyper smart contracts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <header className="border-b border-zinc-800 px-6 py-4">
          <nav className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="text-lg font-bold tracking-tight">
              spectr-ai
            </a>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <a href="/history" className="hover:text-zinc-100">
                History
              </a>
              <a
                href="https://github.com/pavelEspitia/spectr-ai"
                className="hover:text-zinc-100"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
