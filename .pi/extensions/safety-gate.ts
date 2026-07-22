import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const protectedFragments = [
  ".env",
  ".git/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".next/",
];

const confirmPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\brm\s+(-[a-z]*r[a-z]*f|--recursive)\b/i, label: "recursive deletion" },
  { pattern: /\bsudo\b/i, label: "sudo" },
  { pattern: /\bgit\s+reset\s+--hard\b/i, label: "destructive Git reset" },
  { pattern: /\bgit\s+clean\s+-[a-z]*[fdx]/i, label: "destructive Git clean" },
  { pattern: /\bgit\s+(checkout|restore)\s+(\.|--)\b/i, label: "discarding working-tree changes" },
  { pattern: /\bgit\s+push\b.*(--force|-f)\b/i, label: "force push" },
  { pattern: /\bgit\s+commit\b/i, label: "Git commit" },
  { pattern: /\bgit\s+push\b/i, label: "Git push" },
  { pattern: /\bgh\s+pr\s+(create|merge|close)\b/i, label: "pull-request mutation" },
  { pattern: /\bgh\s+issue\s+close\b/i, label: "issue closure" },
  { pattern: /\bnpm\s+publish\b/i, label: "package publication" },
  { pattern: /\bdocker\s+system\s+prune\b/i, label: "Docker system prune" },
];

function comparable(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

export default function safetyGate(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      const rawPath = String(event.input.path ?? "");
      const repoRoot = path.resolve(process.cwd());
      const target = path.resolve(repoRoot, rawPath);
      const rootComparable = comparable(repoRoot);
      const targetComparable = comparable(target);
      const relativeComparable = comparable(path.relative(repoRoot, target));

      if (
        targetComparable !== rootComparable &&
        !targetComparable.startsWith(`${rootComparable}/`)
      ) {
        return {
          block: true,
          reason: `Write outside repository blocked: ${rawPath}`,
        };
      }

      if (protectedFragments.some((fragment) => relativeComparable.includes(fragment))) {
        return {
          block: true,
          reason: `Generated or protected path must not be edited directly: ${rawPath}`,
        };
      }
    }

    if (event.toolName !== "bash") return undefined;

    const command = String(event.input.command ?? "");
    const match = confirmPatterns.find(({ pattern }) => pattern.test(command));
    if (!match) return undefined;

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: `${match.label} blocked in non-interactive mode`,
      };
    }

    const choice = await ctx.ui.select(
      `Confirm ${match.label}:\n\n${command}`,
      ["Allow once", "Block"],
    );

    if (choice !== "Allow once") {
      return {
        block: true,
        reason: `${match.label} blocked by user`,
      };
    }

    return undefined;
  });
}
