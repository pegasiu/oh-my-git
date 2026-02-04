import { ensureDirs, loadConfig, toHomeShortcut } from "@oh-my-git/core";
import type { CAC } from "cac";
import type { CliContext } from "../context";
import { formatProfile, loadProfiles } from "../services/profiles";

export function registerStatusCommand(cli: CAC, ctx: CliContext): void {
  cli.command("status", "Show profiles and mappings").action(async () => {
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    const profiles = await loadProfiles(ctx.fs, ctx.env, config);

    ctx.log("Profiles:");
    if (profiles.length === 0) {
      ctx.log("  (none)");
    } else {
      for (const profile of profiles) {
        ctx.log(`  - ${formatProfile(profile)} | ${profile.ssh.hostAlias}`);
      }
    }

    ctx.log("Mappings:");
    if (config.mappings.length === 0) {
      ctx.log("  (none)");
    } else {
      for (const mapping of config.mappings) {
        ctx.log(`  - ${toHomeShortcut(mapping.path, ctx.env.homeDir)} -> ${mapping.profileId}`);
      }
    }
  });
}
