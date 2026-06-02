import type { Metadata } from "next";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "spectr-ai: AI Smart Contract Auditor (Local or Cloud)",
  description:
    "Audit Solidity and Vyper smart contracts with AI. Run with Claude or fully local via Ollama. Your code never leaves your machine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${playfair.variable} ${jetbrains.variable}`}
    >
      <body className="bg-charcoal text-zinc-100 min-h-screen antialiased">
        <header className="site-header border-b border-zinc-800 px-6 py-4">
          <nav className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="monogram-glow font-serif italic text-amber text-2xl leading-none"
              >
                N
              </span>
              <span className="font-serif italic text-lg tracking-tight">
                spectr-ai
              </span>
            </a>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <a href="/pricing" className="hover:text-zinc-100">
                API
              </a>
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
