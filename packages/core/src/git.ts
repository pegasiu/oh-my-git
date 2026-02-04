import { APP, GITHUB } from "@oh-my-git/shared";
import { backupFile } from "./backup";
import { removeBlock, upsertBlock } from "./blocks";
import { ensureTrailingSlash, getAppDirs, joinPath } from "./paths";
import type { EnvAdapter, FsAdapter, Mapping, Profile } from "./types";

export function gitConfigPath(env: EnvAdapter): string {
  return joinPath(env.homeDir, ".gitconfig");
}

export function includeFilePath(env: EnvAdapter, profileId: string): string {
  const dirs = getAppDirs(env);
  return joinPath(dirs.includesDir, `${profileId}.gitconfig`);
}

export function renderIncludeFile(profile: Profile): string {
  const lines = [
    `# Managed by ${APP.name} (${profile.id})`,
    "[user]",
    `  name = ${profile.git.name}`,
    `  email = ${profile.git.email}`,
    "",
    `[url "git@${profile.ssh.hostAlias}:"]`,
    `  insteadOf = git@${GITHUB.host}:`,
    `  insteadOf = https://${GITHUB.host}/`,
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

export async function writeIncludeFile(
  fs: FsAdapter,
  env: EnvAdapter,
  profile: Profile,
): Promise<void> {
  const path = includeFilePath(env, profile.id);
  await fs.writeFile(path, renderIncludeFile(profile));
}

export function renderIncludeBlock(mapping: Mapping, includePath: string): string {
  const gitDir = ensureTrailingSlash(mapping.path);
  const pathValue = includePath.includes(" ") ? `"${includePath}"` : includePath;
  return `[includeIf "gitdir:${gitDir}"]\n  path = ${pathValue}`;
}

export async function upsertGitIncludeMapping(
  fs: FsAdapter,
  env: EnvAdapter,
  mapping: Mapping,
): Promise<void> {
  const gitPath = gitConfigPath(env);
  const includePath = includeFilePath(env, mapping.profileId);
  const current = (await fs.exists(gitPath)) ? await fs.readFile(gitPath) : "";
  const next = upsertBlock(
    current,
    "include",
    mapping.id,
    renderIncludeBlock(mapping, includePath),
  );
  if (next === current) return;
  await backupFile(fs, env, gitPath);
  await fs.writeFile(gitPath, next);
}

export async function removeGitIncludeMapping(
  fs: FsAdapter,
  env: EnvAdapter,
  mappingId: string,
): Promise<void> {
  const gitPath = gitConfigPath(env);
  if (!(await fs.exists(gitPath))) return;
  const current = await fs.readFile(gitPath);
  const next = removeBlock(current, "include", mappingId);
  if (next === current) return;
  await backupFile(fs, env, gitPath);
  await fs.writeFile(gitPath, next);
}
