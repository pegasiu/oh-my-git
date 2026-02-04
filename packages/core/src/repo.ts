import type { Profile, ShellAdapter } from "./types";

async function runOrThrow(
  shell: ShellAdapter,
  cmd: string,
  args: string[],
  cwd?: string,
): Promise<void> {
  const result = await shell.exec(cmd, args, { cwd });
  if (result.code !== 0) {
    const err = result.stderr || result.stdout || `Command failed: ${cmd}`;
    throw new Error(err.trim());
  }
}

export async function applyProfileToRepo(
  shell: ShellAdapter,
  profile: Profile,
  repoPath: string,
): Promise<void> {
  await runOrThrow(shell, "git", ["-C", repoPath, "config", "user.name", profile.git.name]);
  await runOrThrow(shell, "git", ["-C", repoPath, "config", "user.email", profile.git.email]);
}
