import {
  applyProfileToRepo,
  ensureDirs,
  loadConfig,
  loadProfile,
  resolvePath,
} from "@oh-my-git/core";
import type { Profile } from "@oh-my-git/shared";
import type { CAC } from "cac";
import type { CliContext } from "../context";
import { loadProfiles } from "../services/profiles";
import { runCmd } from "../services/run-cmd";
import { selectProfile } from "../tui/profile-picker";
import { normalizeCloneUrl, parseCloneArgs } from "../utils/clone";

export function registerCloneCommands(cli: CAC, ctx: CliContext): void {
  const cloneAction = async (
    repoInput: string | string[],
    options: { profile?: string; dir?: string },
  ) => {
    const { repo, dir } = parseCloneArgs(repoInput, options.dir);
    if (!repo) {
      throw new Error("Repository SSH URL is required.");
    }
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    const profiles = await loadProfiles(ctx.fs, ctx.env, config);
    if (profiles.length === 0) {
      throw new Error("No profiles found. Create one first with omg profile add.");
    }

    let profile: Profile;
    if (options.profile) {
      const loaded = await loadProfile(ctx.fs, ctx.env, options.profile);
      if (!loaded) throw new Error(`Profile not found: ${options.profile}`);
      profile = loaded;
    } else {
      const selected = await selectProfile(profiles);
      if (!selected) {
        ctx.log("Cancelled.");
        return;
      }
      profile = selected;
    }

    const { url, repoName } = normalizeCloneUrl(repo, profile);
    const cloneArgs = ["clone", url];
    if (dir) cloneArgs.push(dir);

    await runCmd(ctx.shell, "git", cloneArgs, { stdio: "inherit" });

    const targetPath = resolvePath(dir || repoName, ctx.env);
    await applyProfileToRepo(ctx.shell, profile, targetPath);

    ctx.log(`Cloned and applied profile ${profile.id} to ${targetPath}`);
  };

  cli
    .command("clone <repo...>", "Clone a repo with a selected profile (optional target dir)")
    .option("--profile <id>", "Profile id to use")
    .option("--dir <path>", "Target directory")
    .action(cloneAction);

  cli
    .command("init <repo...>", "Alias for clone (optional target dir)")
    .option("--profile <id>", "Profile id to use")
    .option("--dir <path>", "Target directory")
    .action(cloneAction);
}
