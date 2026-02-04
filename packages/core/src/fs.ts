import { joinPath } from "./paths";
import type { FsAdapter } from "./types";

export async function readFileOrEmpty(fs: FsAdapter, path: string): Promise<string> {
  if (!(await fs.exists(path))) return "";
  return fs.readFile(path);
}

export async function ensureParentDir(fs: FsAdapter, path: string): Promise<void> {
  const dir = path.split("/").slice(0, -1).join("/");
  if (!dir) return;
  await fs.mkdir(dir, { recursive: true });
}

export async function writeFileSafe(fs: FsAdapter, path: string, data: string): Promise<void> {
  await ensureParentDir(fs, path);
  await fs.writeFile(path, data);
}

export function normalizePath(path: string): string {
  return joinPath(path);
}
