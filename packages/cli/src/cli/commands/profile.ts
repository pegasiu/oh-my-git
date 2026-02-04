import {
  createMapping,
  deleteProfile,
  ensureDirs,
  includeFilePath,
  loadConfig,
  loadProfile,
  removeGitIncludeMapping,
  removeSshConfig,
  resolvePath,
  saveConfig,
  saveProfile,
  slugify,
  upsertGitIncludeMapping,
  upsertSshConfig,
  writeIncludeFile,
} from "@oh-my-git/core";
import type { Profile } from "@oh-my-git/shared";
import { buildHostAlias } from "@oh-my-git/shared";
import type { CAC } from "cac";
import type { CliContext } from "../context";
import { formatProfile, loadProfiles, uniqueProfileId } from "../services/profiles";
import { generateKey } from "../services/ssh-keys";

export function registerProfileCommands(cli: CAC, ctx: CliContext): void {
  cli
    .command("profile add", "Add a new profile")
    .option("--id <id>", "Profile id")
    .option("--label <label>", "Display label")
    .option("--name <name>", "Git user.name")
    .option("--email <email>", "Git user.email")
    .option("--key-path <path>", "SSH key path")
    .option("--host-alias <alias>", "SSH host alias")
    .option("--gh-user <username>", "GitHub username for gh auth switch")
    .option("--generate-key", "Generate an ed25519 SSH key")
    .option("--map-dir <path>", "Create a directory mapping for this profile")
    .action(async (options) => {
      await ensureDirs(ctx.fs, ctx.env);
      const config = await loadConfig(ctx.fs, ctx.env);

      const label = options.label || options.name || options.email;
      if (!label) throw new Error("Provide --label or --name or --email");
      if (!options.name || !options.email) {
        throw new Error("Provide both --name and --email");
      }

      const baseId = options.id || slugify(label);
      const id = uniqueProfileId(baseId, config);
      const hostAlias = options.hostAlias || buildHostAlias(id);
      const keyPathInput = options.keyPath || `~/.ssh/id_ed25519_${id}`;
      const keyPath = resolvePath(keyPathInput, ctx.env);

      if (options.generateKey) {
        await generateKey(ctx.fs, ctx.shell, keyPath, options.email);
      }

      const now = ctx.nowIso();
      const profile: Profile = {
        id,
        label,
        git: { name: options.name, email: options.email },
        ssh: { keyPath, hostAlias },
        github: options.ghUser ? { username: options.ghUser } : undefined,
        createdAt: now,
        updatedAt: now,
      };

      await saveProfile(ctx.fs, ctx.env, profile);
      await upsertSshConfig(ctx.fs, ctx.env, profile);
      await writeIncludeFile(ctx.fs, ctx.env, profile);

      if (!config.profiles.includes(id)) config.profiles.push(id);

      if (options.mapDir) {
        const resolved = resolvePath(options.mapDir, ctx.env);
        const mapping = createMapping(resolved, id);
        config.mappings = config.mappings.filter((item) => item.path !== mapping.path);
        config.mappings.push(mapping);
        await upsertGitIncludeMapping(ctx.fs, ctx.env, mapping);
      }

      await saveConfig(ctx.fs, ctx.env, config);
      ctx.log(`Added profile ${formatProfile(profile)}`);
    });

  cli.command("profile list", "List profiles").action(async () => {
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    const profiles = await loadProfiles(ctx.fs, ctx.env, config);
    if (profiles.length === 0) {
      ctx.log("No profiles found.");
      return;
    }
    for (const profile of profiles) {
      ctx.log(`${formatProfile(profile)} | ${profile.ssh.hostAlias}`);
    }
  });

  cli.command("profile remove <id>", "Remove profile").action(async (id) => {
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    const profile = await loadProfile(ctx.fs, ctx.env, id);
    if (!profile) throw new Error(`Profile not found: ${id}`);

    const mappingsToRemove = config.mappings.filter((m) => m.profileId === id);
    for (const mapping of mappingsToRemove) {
      await removeGitIncludeMapping(ctx.fs, ctx.env, mapping.id);
    }

    config.mappings = config.mappings.filter((m) => m.profileId !== id);
    config.profiles = config.profiles.filter((pid) => pid !== id);

    const includePath = includeFilePath(ctx.env, id);
    if (ctx.fs.remove) await ctx.fs.remove(includePath);
    await removeSshConfig(ctx.fs, ctx.env, id);
    await deleteProfile(ctx.fs, ctx.env, id);
    await saveConfig(ctx.fs, ctx.env, config);
    ctx.log(`Removed profile ${id}`);
  });
}
