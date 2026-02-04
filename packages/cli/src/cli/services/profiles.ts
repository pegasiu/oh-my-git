import { loadProfile } from "@oh-my-git/core";
import type { AppConfig, EnvAdapter, FsAdapter, Profile } from "@oh-my-git/shared";

export async function loadProfiles(
  fs: FsAdapter,
  env: EnvAdapter,
  config: AppConfig,
): Promise<Profile[]> {
  const results: Profile[] = [];
  for (const id of config.profiles) {
    const profile = await loadProfile(fs, env, id);
    if (profile) results.push(profile);
  }
  return results;
}

export function uniqueProfileId(baseId: string, config: AppConfig): string {
  let candidate = baseId;
  let index = 2;
  while (config.profiles.includes(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
}

export function formatProfile(profile: Profile): string {
  return `${profile.id} (${profile.git.name} <${profile.git.email}>)`;
}
