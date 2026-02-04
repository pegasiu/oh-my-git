import { escapeRegExp, GITHUB } from "@oh-my-git/shared";

// biome-ignore lint/complexity/useRegexLiterals: avoid control-character regex literals
const NON_PRINTABLE_ASCII = new RegExp("[^\\u0009\\u000A\\u000D\\u0020-\\u007E]", "g");
// biome-ignore lint/complexity/useRegexLiterals: avoid control-character regex literals
const ANSI_ESCAPE = new RegExp("\\u001b\\[[0-9;]*m", "g");

export function stripAnsi(text: string) {
  return text.replace(ANSI_ESCAPE, "");
}

export function normalizeGhText(text: string) {
  return stripAnsi(text).replace(NON_PRINTABLE_ASCII, "").replace(/\r/g, "\n");
}

export function parseGhStatus(text: string) {
  const normalized = text
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .join("\n");
  const accounts = new Set<string>();
  const escapedHost = escapeRegExp(GITHUB.host);
  for (const match of normalized.matchAll(
    new RegExp(`Logged in to ${escapedHost} (?:as|account)\\s+([A-Za-z0-9-]+)`, "gi"),
  )) {
    accounts.add(match[1]);
  }
  for (const match of normalized.matchAll(
    new RegExp(`${escapedHost} account\\s+([A-Za-z0-9-]+)`, "gi"),
  )) {
    accounts.add(match[1]);
  }
  const activeMatch = normalized.match(/Active account:\s*([^\s]+)/i);
  const activeRaw = activeMatch?.[1] ?? "";
  const activeUser = activeRaw && !/^(true|false)$/i.test(activeRaw) ? activeRaw : "";
  return { accounts: Array.from(accounts), activeUser };
}
