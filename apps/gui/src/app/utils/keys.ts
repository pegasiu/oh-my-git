import type { ShellAdapter } from "@oh-my-git/shared";
import { extractPublicKeyMaterial } from "@oh-my-git/shared";

type GhKey = { id: number; title: string; key: string };

export async function ghListKeys(shell: ShellAdapter): Promise<GhKey[]> {
  const result = await shell.exec("gh", ["api", "/user/keys"]);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to list GitHub keys");
  }
  const data = JSON.parse(result.stdout) as Array<{ id: number; title: string; key: string }>;
  if (!Array.isArray(data)) return [];
  return data;
}

export async function findKeyByMaterial(shell: ShellAdapter, pubKey: string) {
  const material = extractPublicKeyMaterial(pubKey);
  const keys = await ghListKeys(shell);
  return keys.find((item) => item.key.trim() === material) || null;
}
