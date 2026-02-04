import { basename, getAppDirs, joinPath } from "./paths";
import type { EnvAdapter, FsAdapter } from "./types";

export function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export async function backupFile(
  fs: FsAdapter,
  env: EnvAdapter,
  path: string,
): Promise<string | null> {
  if (!(await fs.exists(path))) return null;
  const content = await fs.readFile(path);
  const dirs = getAppDirs(env);
  const fileBase = basename(path) || "config";
  const dest = joinPath(dirs.backupsDir, `${fileBase}.${timestamp()}`);
  await fs.mkdir(dirs.backupsDir, { recursive: true });
  await fs.writeFile(dest, content);
  return dest;
}
