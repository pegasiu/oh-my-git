import { ensureParentDir } from "@oh-my-git/core";
import type { FsAdapter, ShellAdapter } from "@oh-my-git/shared";

export async function generateKey(
  fs: FsAdapter,
  shell: ShellAdapter,
  path: string,
  email: string,
): Promise<void> {
  await ensureParentDir(fs, path);
  if (await fs.exists(path)) {
    throw new Error(`SSH key already exists at ${path}`);
  }
  const result = await shell.exec("ssh-keygen", [
    "-t",
    "ed25519",
    "-f",
    path,
    "-C",
    email,
    "-N",
    "",
  ]);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || "ssh-keygen failed");
  }
}
