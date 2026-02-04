import { ensureDirs, loadProfile } from "@oh-my-git/core";
import type { CAC } from "cac";
import type { CliContext } from "../context";

export function registerSshCommands(cli: CAC, ctx: CliContext): void {
  cli.command("ssh test <profileId>", "Test SSH for a profile").action(async (profileId) => {
    await ensureDirs(ctx.fs, ctx.env);
    const profile = await loadProfile(ctx.fs, ctx.env, profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);
    const result = await ctx.shell.exec("ssh", ["-T", `git@${profile.ssh.hostAlias}`], {
      stdio: "inherit",
    });
    if (result.code !== 0) process.exitCode = result.code;
  });
}
