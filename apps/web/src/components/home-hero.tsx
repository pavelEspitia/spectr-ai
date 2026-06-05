"use client";

import { motion, useReducedMotion } from "motion/react";
import { UploadZone } from "@/components/upload-zone";
import { AddressAudit } from "@/components/address-audit";

export function HomeHero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
  };

  return (
    <motion.div
      className="space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.section
        variants={item}
        className="text-center space-y-5 pt-8"
      >
        <h1 className="text-4xl font-serif italic tracking-tight">
          Audit smart contracts with AI:{" "}
          <span className="text-amber">locally or in the cloud</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Paste a deployed contract address to audit it straight from the chain,
          or drop a Solidity / Vyper file for an instant report powered by
          Claude. Prefer local? The open-source CLI runs fully offline with
          Ollama: your code never leaves your machine.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 pt-1">
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            Open source on GitHub
          </span>
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            CLI runs locally via Ollama
          </span>
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            Solidity + Vyper
          </span>
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            JSON · SARIF · HTML
          </span>
        </div>
      </motion.section>
      <motion.div variants={item} className="space-y-5">
        <AddressAudit />
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" />
          or upload a file
          <span className="h-px flex-1 bg-zinc-800" />
        </div>
        <UploadZone />
      </motion.div>
    </motion.div>
  );
}
