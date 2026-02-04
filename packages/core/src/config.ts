import { getAppDirs, joinPath } from "./paths";
import type { AppConfig, EnvAdapter, FsAdapter } from "./types";

export function defaultConfig(): AppConfig {
  return { version: 1, profiles: [], mappings: [] };
}

export function configPath(env: EnvAdapter): string {
  const dirs = getAppDirs(env);
  return joinPath(dirs.configDir, "config.json");
}

export async function ensureDirs(fs: FsAdapter, env: EnvAdapter): Promise<void> {
  const dirs = getAppDirs(env);
  await fs.mkdir(dirs.configDir, { recursive: true });
  await fs.mkdir(dirs.profilesDir, { recursive: true });
  await fs.mkdir(dirs.includesDir, { recursive: true });
  await fs.mkdir(dirs.backupsDir, { recursive: true });
}

export async function loadConfig(fs: FsAdapter, env: EnvAdapter): Promise<AppConfig> {
  const path = configPath(env);
  if (!(await fs.exists(path))) return defaultConfig();
  const raw = await fs.readFile(path);
  const parsed = JSON.parse(raw) as AppConfig;
  if (!parsed.version) return defaultConfig();
  return {
    version: 1,
    profiles: parsed.profiles || [],
    mappings: parsed.mappings || [],
    defaultProfileId: parsed.defaultProfileId,
  };
}

export async function saveConfig(fs: FsAdapter, env: EnvAdapter, config: AppConfig): Promise<void> {
  const path = configPath(env);
  await fs.writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
}
