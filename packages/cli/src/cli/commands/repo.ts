import {
  applyProfileToRepo,
  ensureDirs,
  loadProfile,
  resolvePath,
  toHomeShortcut,
} from "@oh-my-git/core";
import type { CAC } from "cac";
import type { CliContext } from "../context";

export function registerRepoCommands(cli: CAC, ctx: CliContext): void {
  cli
    .command("repo use <profileId> [path]", "Apply profile to a repo")
    .action(async (profileId, pathInput) => {
      await ensureDirs(ctx.fs, ctx.env);
      const profile = await loadProfile(ctx.fs, ctx.env, profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);
      const repoPath = resolvePath(pathInput || ctx.env.cwd || process.cwd(), ctx.env);
      await applyProfileToRepo(ctx.shell, profile, repoPath);
      ctx.log(`Applied ${profileId} to ${toHomeShortcut(repoPath, ctx.env.homeDir)}`);
    });
}
