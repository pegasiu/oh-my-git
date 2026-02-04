import type { FsAdapter, ShellAdapter } from "@oh-my-git/shared";
import { escapeRegExp, extractPublicKeyMaterial, GITHUB } from "@oh-my-git/shared";

export type GhKey = { id: number; title: string; key: string };

export async function ensureGhAvailable(shell: ShellAdapter): Promise<void> {
  const result = await shell.exec("gh", ["--version"]);
  if (result.code !== 0) {
    throw new Error("GitHub CLI (gh) not found in PATH.");
  }
}

export async function ensureGhAuthed(shell: ShellAdapter): Promise<void> {
  const result = await shell.exec("gh", ["auth", "status", "--hostname", GITHUB.host]);
  if (result.code !== 0) {
    throw new Error("GitHub CLI not authenticated. Run `gh auth login`.");
  }
}

export async function getGhAccounts(shell: ShellAdapter): Promise<string[]> {
  const result = await shell.exec("gh", ["auth", "status", "--hostname", GITHUB.host]);
  if (result.code !== 0) return [];
  const text = `${result.stdout}\n${result.stderr}`;
  const escapedHost = escapeRegExp(GITHUB.host);
  const matches = Array.from(
    text.matchAll(new RegExp(`Logged in to ${escapedHost} as ([^\\s]+)`, "gi")),
  );
  const accounts = matches.map((match) => match[1]);
  const activeMatch = text.match(/Active account:\s*([^\s]+)/i);
  if (activeMatch) accounts.unshift(activeMatch[1]);
  return Array.from(new Set(accounts.filter(Boolean)));
}

export async function ghListKeys(shell: ShellAdapter): Promise<GhKey[]> {
  const result = await shell.exec("gh", ["api", "/user/keys"]);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to list GitHub keys");
  }
  const data = JSON.parse(result.stdout) as Array<{ id: number; title: string; key: string }>;
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({ id: item.id, title: item.title, key: item.key }));
}

export async function findGhKeyByMaterial(
  fs: FsAdapter,
  shell: ShellAdapter,
  pubKeyPath: string,
): Promise<GhKey | null> {
  const pubKey = await fs.readFile(pubKeyPath);
  const material = extractPublicKeyMaterial(pubKey);
  const keys = await ghListKeys(shell);
  return keys.find((item) => item.key.trim() === material) || null;
}
