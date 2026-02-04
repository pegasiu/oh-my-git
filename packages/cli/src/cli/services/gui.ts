import path from "node:path";
import type { EnvAdapter, FsAdapter, Platform, ShellAdapter } from "@oh-my-git/shared";
import { APP } from "@oh-my-git/shared";
import { runCmd } from "./run-cmd";

async function findRepoRoot(fs: FsAdapter, startDir: string): Promise<string | null> {
  let current = startDir;
  while (true) {
    const candidate = path.join(current, "apps", "gui");
    if (await fs.exists(candidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export async function getRepoRoot(
  fs: FsAdapter,
  env: EnvAdapter,
  packageRoot: string,
): Promise<string | null> {
  const fromCwd = await findRepoRoot(fs, env.cwd || process.cwd());
  if (fromCwd) return fromCwd;
  return findRepoRoot(fs, packageRoot);
}

function resolvePlatform(env: EnvAdapter): Platform | undefined {
  return env.platform || (process.platform as Platform);
}

export function getPackagedGuiPath(packageRoot: string, env: EnvAdapter): string | null {
  const platform = resolvePlatform(env);
  if (platform === "darwin") {
    return path.join(packageRoot, "gui", "macos", `${APP.name}.app`);
  }
  if (platform === "linux") {
    return path.join(packageRoot, "gui", "linux", `${APP.name}.AppImage`);
  }
  return null;
}

export function getRepoBuiltGuiPath(repoRoot: string, env: EnvAdapter): string | null {
  const platform = resolvePlatform(env);
  if (platform === "darwin") {
    return path.join(
      repoRoot,
      "apps",
      "gui",
      "src-tauri",
      "target",
      "release",
      "bundle",
      "macos",
      `${APP.name}.app`,
    );
  }
  if (platform === "linux") {
    return path.join(
      repoRoot,
      "apps",
      "gui",
      "src-tauri",
      "target",
      "release",
      "bundle",
      "appimage",
      `${APP.name}.AppImage`,
    );
  }
  return null;
}

export async function openGui(
  fs: FsAdapter,
  env: EnvAdapter,
  shell: ShellAdapter,
  packageRoot: string,
): Promise<void> {
  const platform = resolvePlatform(env);
  if (platform === "darwin") {
    const packaged = getPackagedGuiPath(packageRoot, env);
    if (packaged && (await fs.exists(packaged))) {
      await runCmd(shell, "open", [packaged]);
      return;
    }
    const repoRoot = await getRepoRoot(fs, env, packageRoot);
    if (repoRoot) {
      const appPath = getRepoBuiltGuiPath(repoRoot, env);
      if (appPath && (await fs.exists(appPath))) {
        await runCmd(shell, "open", [appPath]);
        return;
      }
    }
    const openByName = await shell.exec("open", ["-a", APP.name]);
    if (openByName.code === 0) return;
    throw new Error("GUI app not found. Run `bun run release` in the repo first.");
  }

  if (platform === "linux") {
    const packaged = getPackagedGuiPath(packageRoot, env);
    if (packaged && (await fs.exists(packaged))) {
      const chmod = await shell.exec("chmod", ["+x", packaged]);
      if (chmod.code !== 0) {
        throw new Error(chmod.stderr || chmod.stdout || "Failed to chmod AppImage");
      }
      await runCmd(shell, packaged, [], { stdio: "inherit" });
      return;
    }
    const repoRoot = await getRepoRoot(fs, env, packageRoot);
    const appImage = repoRoot ? getRepoBuiltGuiPath(repoRoot, env) : null;
    if (appImage && (await fs.exists(appImage))) {
      const chmod = await shell.exec("chmod", ["+x", appImage]);
      if (chmod.code !== 0) {
        throw new Error(chmod.stderr || chmod.stdout || "Failed to chmod AppImage");
      }
      await runCmd(shell, appImage, [], { stdio: "inherit" });
      return;
    }
    throw new Error("GUI app not found. Run `bun run release` in the repo first.");
  }

  throw new Error("GUI open is only supported on macOS and Linux for now.");
}
