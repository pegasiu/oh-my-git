import {
  createMapping,
  ensureDirs,
  ensureTrailingSlash,
  loadConfig,
  loadProfile,
  removeGitIncludeMapping,
  resolvePath,
  saveConfig,
  toHomeShortcut,
  upsertGitIncludeMapping,
} from "@oh-my-git/core";
import type { CAC } from "cac";
import type { CliContext } from "../context";

export function registerDirCommands(cli: CAC, ctx: CliContext): void {
  cli
    .command("dir map <path> <profileId>", "Map a directory to a profile")
    .action(async (pathInput, profileId) => {
      await ensureDirs(ctx.fs, ctx.env);
      const config = await loadConfig(ctx.fs, ctx.env);
      const profile = await loadProfile(ctx.fs, ctx.env, profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);

      const resolved = resolvePath(pathInput, ctx.env);
      const mapping = createMapping(resolved, profileId);
      const existing = config.mappings.find((item) => item.path === mapping.path);
      if (existing && existing.id !== mapping.id) {
        await removeGitIncludeMapping(ctx.fs, ctx.env, existing.id);
        config.mappings = config.mappings.filter((item) => item.id !== existing.id);
      }

      config.mappings = config.mappings.filter((item) => item.id !== mapping.id);
      config.mappings.push(mapping);
      await upsertGitIncludeMapping(ctx.fs, ctx.env, mapping);
      await saveConfig(ctx.fs, ctx.env, config);
      ctx.log(`Mapped ${toHomeShortcut(resolved, ctx.env.homeDir)} -> ${profileId}`);
    });

  cli.command("dir list", "List directory mappings").action(async () => {
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    if (config.mappings.length === 0) {
      ctx.log("No directory mappings.");
      return;
    }
    for (const mapping of config.mappings) {
      ctx.log(`${toHomeShortcut(mapping.path, ctx.env.homeDir)} -> ${mapping.profileId}`);
    }
  });

  cli.command("dir unmap <pathOrId>", "Remove directory mapping").action(async (pathOrId) => {
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    const resolved = resolvePath(pathOrId, ctx.env);
    const normalized = ensureTrailingSlash(resolved);
    const mapping = config.mappings.find(
      (item) => item.id === pathOrId || item.path === normalized,
    );
    if (!mapping) {
      ctx.log("Mapping not found.");
      return;
    }
    await removeGitIncludeMapping(ctx.fs, ctx.env, mapping.id);
    config.mappings = config.mappings.filter((item) => item.id !== mapping.id);
    await saveConfig(ctx.fs, ctx.env, config);
    ctx.log(`Removed mapping ${mapping.id}`);
  });
}
