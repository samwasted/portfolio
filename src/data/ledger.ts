/**
 * Event ledger entries shown on the home page.
 *
 * Add, remove or reorder freely: entries are sorted by date, and the brush
 * stroke beside them is regenerated to fit however many there are.
 *
 * level sets both the text treatment and the stroke weight:
 *   "standard"  — dim text, hairline stroke
 *   "medium"    — brighter text, medium stroke
 *   "highlight" — glowing text, full-weight stroke
 */

export type LedgerLevel = "standard" | "medium" | "highlight";

export interface LedgerEntry {
  tag: string;
  /** YYYY-MM, also used for sorting */
  date: string;
  level: LedgerLevel;
  text: string;
}

export const ledger: LedgerEntry[] = [
  {
    tag: "BASE",
    date: "2024-07",
    level: "standard",
    text: "System initialization: Admitted to Indian Institute of Technology (IIT) BHU, Varanasi. Enrolled in Mathematics and Computing (IDD).",
  },
  {
    tag: "INDUCT",
    date: "2025-06",
    level: "standard",
    text: "Club of Programmers (COPS) selection following full-stack Next.js, Redis, and WebSocket application deployments.",
  },
  {
    tag: "AWARD",
    date: "2025-12",
    level: "highlight",
    text: "Bronze Medal at Inter IIT Tech Meet 14.0 (Quant Problem Statement). Market models and backtesting pipeline architecture.",
  },
  {
    tag: "INDUCT",
    date: "2026-01",
    level: "standard",
    text: "Algorithmic Trading vertical selection at The Quant Club (TQC), IIT BHU.",
  },
  {
    tag: "RANK",
    date: "2026-02",
    level: "medium",
    text: "Reached Expert rank on Codeforces.",
  },
  {
    tag: "CORE",
    date: "2026-04",
    level: "highlight",
    text: '"jailsh" C++17 interactive execution sandbox and container runtime. Engineered a strict double-fork PID 1 init model, IPC handshakes, and cgroups v2 boundaries.',
  },
];
