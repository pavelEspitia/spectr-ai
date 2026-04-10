import { watch, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import pc from "picocolors";

export interface WatchOptions {
  paths: string[];
  debounceMs?: number;
  onChanged: (files: string[]) => Promise<void>;
}

export function startWatcher(options: WatchOptions): void {
  const { paths, onChanged, debounceMs = 1000 } = options;

  const dirs = new Set<string>();
  const watchedFiles = new Set<string>();

  for (const p of paths) {
    const resolved = resolve(p);
    try {
      const stat = statSync(resolved);
      if (stat.isDirectory()) {
        dirs.add(resolved);
      } else {
        dirs.add(resolve(resolved, ".."));
        watchedFiles.add(resolved);
      }
    } catch {
      // skip invalid paths
    }
  }

  let pending: Set<string> = new Set();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  function flush(): void {
    if (running || pending.size === 0) return;
    const files = [...pending];
    pending = new Set();
    running = true;

    onChanged(files).finally(() => {
      running = false;
      if (pending.size > 0) flush();
    });
  }

  function handleChange(filename: string | null, dir: string): void {
    if (!filename) return;
    const full = resolve(dir, filename);
    const ext = extname(filename);

    if (ext !== ".sol" && ext !== ".vy") return;
    if (watchedFiles.size > 0 && !watchedFiles.has(full)) return;

    pending.add(full);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  }

  for (const dir of dirs) {
    watch(dir, { recursive: true }, (_, filename) => {
      handleChange(filename, dir);
    });
  }

  console.error(
    pc.dim(
      `\n  watching ${dirs.size} director${dirs.size === 1 ? "y" : "ies"} for changes... (Ctrl+C to stop)\n`,
    ),
  );
}
