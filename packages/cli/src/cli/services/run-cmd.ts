import type { ShellAdapter } from "@oh-my-git/shared";

type RunCmdOptions = { cwd?: string; stdio?: "inherit" | "pipe" };

export async function runCmd(
  shell: ShellAdapter,
  cmd: string,
  args: string[],
  opts?: RunCmdOptions,
): Promise<void> {
  const result = await shell.exec(cmd, args, { cwd: opts?.cwd, stdio: opts?.stdio });
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `Command failed: ${cmd}`);
  }
}
