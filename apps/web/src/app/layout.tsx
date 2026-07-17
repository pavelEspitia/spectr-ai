import type { Metadata } from "next";
import { Bodoni_Moda, Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["600", "700"],
  variable: "--font-bodoni",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-archivo",
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
      className={`dark ${bodoni.variable} ${archivo.variable} ${jetbrains.variable}`}
    >
      <body className="bg-charcoal text-zinc-100 min-h-screen antialiased">
        <div className="sky" aria-hidden="true">
          <div className="ember ember-a" />
          <div className="ember ember-b" />
          <div className="ember ember-c" />
        </div>
        <div className="grain" aria-hidden="true" />
        <header className="site-header px-6 py-4">
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
