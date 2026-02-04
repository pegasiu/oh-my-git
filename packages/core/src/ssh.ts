import { GITHUB } from "@oh-my-git/shared";
import { backupFile } from "./backup";
import { removeBlock, upsertBlock } from "./blocks";
import { readFileOrEmpty, writeFileSafe } from "./fs";
import { joinPath, toHomeShortcut } from "./paths";
import type { EnvAdapter, FsAdapter, Profile } from "./types";

export function sshConfigPath(env: EnvAdapter): string {
  return joinPath(env.homeDir, ".ssh", "config");
}

export function renderSshBlock(profile: Profile, homeDir?: string): string {
  const keyPath = homeDir ? toHomeShortcut(profile.ssh.keyPath, homeDir) : profile.ssh.keyPath;
  const keyValue = keyPath.includes(" ") ? `"${keyPath}"` : keyPath;
  return [
    `Host ${profile.ssh.hostAlias}`,
    `  HostName ${GITHUB.host}`,
    `  User ${GITHUB.sshUser}`,
    `  IdentityFile ${keyValue}`,
    "  IdentitiesOnly yes",
  ].join("\n");
}

export async function upsertSshConfig(
  fs: FsAdapter,
  env: EnvAdapter,
  profile: Profile,
): Promise<void> {
  const path = sshConfigPath(env);
  const current = await readFileOrEmpty(fs, path);
  const next = upsertBlock(current, "ssh", profile.id, renderSshBlock(profile, env.homeDir));
  if (next === current) return;
  await backupFile(fs, env, path);
  await writeFileSafe(fs, path, next);
}

export async function removeSshConfig(
  fs: FsAdapter,
  env: EnvAdapter,
  profileId: string,
): Promise<void> {
  const path = sshConfigPath(env);
  const current = await readFileOrEmpty(fs, path);
  if (!current) return;
  const next = removeBlock(current, "ssh", profileId);
  if (next === current) return;
  await backupFile(fs, env, path);
  await writeFileSafe(fs, path, next);
}
