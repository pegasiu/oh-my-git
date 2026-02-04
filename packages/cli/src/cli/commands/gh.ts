import { ensureDirs, loadProfile, saveProfile } from "@oh-my-git/core";
import type { Profile } from "@oh-my-git/shared";
import { APP, GITHUB } from "@oh-my-git/shared";
import type { CAC } from "cac";
import type { CliContext } from "../context";
import {
  ensureGhAuthed,
  ensureGhAvailable,
  findGhKeyByMaterial,
  getGhAccounts,
} from "../services/gh";
import { selectGhAccount } from "../tui/account-picker";

export function registerGhCommands(cli: CAC, ctx: CliContext): void {
  cli
    .command("gh login <profileId>", "Login to GitHub via gh for profile")
    .action(async (profileId) => {
      await ensureDirs(ctx.fs, ctx.env);
      const profile = await loadProfile(ctx.fs, ctx.env, profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);
      await ensureGhAvailable(ctx.shell);
      const result = await ctx.shell.exec(
        "gh",
        ["auth", "login", "--hostname", GITHUB.host, "--git-protocol", "ssh"],
        { stdio: "inherit" },
      );
      if (result.code !== 0) process.exitCode = result.code;
    });

  cli.command("gh switch <profileId>", "Switch active GitHub account").action(async (profileId) => {
    await ensureDirs(ctx.fs, ctx.env);
    const profile = await loadProfile(ctx.fs, ctx.env, profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);
    await ensureGhAvailable(ctx.shell);
    if (!profile.github?.username) {
      throw new Error("Profile missing github.username. Add with --gh-user.");
    }
    const result = await ctx.shell.exec("gh", [
      "auth",
      "switch",
      "--hostname",
      GITHUB.host,
      "--user",
      profile.github.username,
    ]);
    if (result.stdout) ctx.log(result.stdout);
    if (result.stderr) ctx.error(result.stderr);
    if (result.code !== 0) process.exitCode = result.code;
  });

  cli
    .command("gh key add <profileId>", "Add profile SSH public key to GitHub")
    .option("--title <title>", "Key title shown in GitHub")
    .option("--no-switch", "Do not switch gh account even if profile has github.username")
    .action(async (profileId, options) => {
      await ensureDirs(ctx.fs, ctx.env);
      const profile = await loadProfile(ctx.fs, ctx.env, profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);
      await ensureGhAvailable(ctx.shell);
      await ensureGhAuthed(ctx.shell);

      if (profile.github?.username && options.switch !== false) {
        const switchResult = await ctx.shell.exec("gh", [
          "auth",
          "switch",
          "--hostname",
          GITHUB.host,
          "--user",
          profile.github.username,
        ]);
        if (switchResult.code !== 0) {
          throw new Error(
            switchResult.stderr ||
              switchResult.stdout ||
              `Failed to switch gh account to ${profile.github.username}`,
          );
        }
      }

      const pubKeyPath = `${profile.ssh.keyPath}.pub`;
      if (!(await ctx.fs.exists(pubKeyPath))) {
        throw new Error(`Public key not found: ${pubKeyPath}`);
      }

      const existing = await findGhKeyByMaterial(ctx.fs, ctx.shell, pubKeyPath);
      if (existing) {
        const now = ctx.nowIso();
        const updated: Profile = {
          ...profile,
          github: {
            ...profile.github,
            keyId: existing.id,
            keyTitle: existing.title,
            keySyncedAt: now,
          },
          updatedAt: now,
        };
        await saveProfile(ctx.fs, ctx.env, updated);
        ctx.log(`Key already exists on GitHub (id ${existing.id}).`);
        return;
      }

      const title = options.title || `${APP.name} ${profile.label} ${ctx.nowIso().slice(0, 10)}`;
      const result = await ctx.shell.exec("gh", ["ssh-key", "add", pubKeyPath, "--title", title]);
      if (result.stdout) ctx.log(result.stdout);
      if (result.stderr) ctx.error(result.stderr);
      if (result.code !== 0) process.exitCode = result.code;

      const added = await findGhKeyByMaterial(ctx.fs, ctx.shell, pubKeyPath);
      const keyId = added?.id ?? profile.github?.keyId;
      const keyTitle = added?.title ?? title;
      const now = ctx.nowIso();
      const updated: Profile = {
        ...profile,
        github: {
          ...profile.github,
          keyId,
          keyTitle,
          keySyncedAt: now,
        },
        updatedAt: now,
      };
      await saveProfile(ctx.fs, ctx.env, updated);
    });

  cli
    .command("gh key remove <profileId>", "Remove profile SSH public key from GitHub")
    .action(async (profileId) => {
      await ensureDirs(ctx.fs, ctx.env);
      const profile = await loadProfile(ctx.fs, ctx.env, profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);
      await ensureGhAvailable(ctx.shell);
      await ensureGhAuthed(ctx.shell);

      if (profile.github?.username) {
        const switchResult = await ctx.shell.exec("gh", [
          "auth",
          "switch",
          "--hostname",
          GITHUB.host,
          "--user",
          profile.github.username,
        ]);
        if (switchResult.code !== 0) {
          throw new Error(
            switchResult.stderr ||
              switchResult.stdout ||
              `Failed to switch gh account to ${profile.github.username}`,
          );
        }
      }

      const pubKeyPath = `${profile.ssh.keyPath}.pub`;
      const keyInfo =
        profile.github?.keyId && profile.github?.keyTitle
          ? { id: profile.github.keyId, title: profile.github.keyTitle, key: "" }
          : await findGhKeyByMaterial(ctx.fs, ctx.shell, pubKeyPath);
      if (!keyInfo) {
        throw new Error("Could not determine key ID. Add the key first.");
      }

      const result = await ctx.shell.exec("gh", ["ssh-key", "delete", String(keyInfo.id), "--yes"]);
      if (result.stdout) ctx.log(result.stdout);
      if (result.stderr) ctx.error(result.stderr);
      if (result.code !== 0) process.exitCode = result.code;

      const now = ctx.nowIso();
      const updated: Profile = {
        ...profile,
        github: {
          ...profile.github,
          keyId: undefined,
          keyTitle: undefined,
          keySyncedAt: undefined,
        },
        updatedAt: now,
      };
      await saveProfile(ctx.fs, ctx.env, updated);
    });

  cli
    .command("gh link <profileId> [username]", "Link profile to a GitHub account")
    .action(async (profileId, username) => {
      await ensureDirs(ctx.fs, ctx.env);
      const profile = await loadProfile(ctx.fs, ctx.env, profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);
      await ensureGhAvailable(ctx.shell);
      await ensureGhAuthed(ctx.shell);

      let selected = username;
      if (!selected) {
        const accounts = await getGhAccounts(ctx.shell);
        if (accounts.length === 0) {
          throw new Error("No GitHub accounts found in gh. Run `gh auth login`.");
        }
        selected = await selectGhAccount(accounts);
      }

      const now = ctx.nowIso();
      const updated: Profile = {
        ...profile,
        github: { ...profile.github, username: selected },
        updatedAt: now,
      };
      await saveProfile(ctx.fs, ctx.env, updated);
      ctx.log(`Linked ${profile.id} -> ${selected}`);
    });
}
