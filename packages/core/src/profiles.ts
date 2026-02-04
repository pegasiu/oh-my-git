import { getAppDirs, joinPath } from "./paths";
import type { EnvAdapter, FsAdapter, Profile } from "./types";

export function profilePath(env: EnvAdapter, id: string): string {
  const dirs = getAppDirs(env);
  return joinPath(dirs.profilesDir, `${id}.json`);
}

export async function loadProfile(
  fs: FsAdapter,
  env: EnvAdapter,
  id: string,
): Promise<Profile | null> {
  const path = profilePath(env, id);
  if (!(await fs.exists(path))) return null;
  const raw = await fs.readFile(path);
  return JSON.parse(raw) as Profile;
}

export async function saveProfile(fs: FsAdapter, env: EnvAdapter, profile: Profile): Promise<void> {
  const path = profilePath(env, profile.id);
  await fs.writeFile(path, `${JSON.stringify(profile, null, 2)}\n`);
}

export async function deleteProfile(fs: FsAdapter, env: EnvAdapter, id: string): Promise<void> {
  const path = profilePath(env, id);
  if (fs.remove) {
    await fs.remove(path);
  }
}
