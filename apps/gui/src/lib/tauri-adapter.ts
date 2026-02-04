import type { EnvAdapter, FsAdapter, ShellAdapter } from "@oh-my-git/shared";

export async function loadTauriAdapters(): Promise<{ fs: FsAdapter; env: EnvAdapter }> {
  const fsPlugin = await import("@tauri-apps/plugin-fs");
  const pathApi = await import("@tauri-apps/api/path");

  const mkdirFn =
    (fsPlugin as typeof fsPlugin & { createDir?: typeof fsPlugin.mkdir }).createDir ||
    fsPlugin.mkdir;
  if (!mkdirFn) {
    throw new Error("Tauri fs plugin is missing mkdir/createDir");
  }

  const removeFileFn = (fsPlugin as typeof fsPlugin & { removeFile?: typeof fsPlugin.remove })
    .removeFile;
  const removeFn = fsPlugin.remove;

  const fs: FsAdapter = {
    readFile: (path: string) => fsPlugin.readTextFile(path),
    writeFile: (path: string, data: string) => fsPlugin.writeTextFile(path, data),
    mkdir: (path: string) => mkdirFn(path, { recursive: true }),
    exists: (path: string) => fsPlugin.exists(path),
    remove: (path: string) => {
      if (removeFileFn) return removeFileFn(path);
      if (removeFn) return removeFn(path, { recursive: true });
      return Promise.resolve();
    },
  };

  const home = await pathApi.homeDir();
  const env: EnvAdapter = {
    homeDir: home,
    platform: undefined,
    cwd: home,
  };

  return { fs, env };
}

export async function loadTauriShell(): Promise<ShellAdapter> {
  const shellPlugin = await import("@tauri-apps/plugin-shell");
  const { Command } = shellPlugin;
  return {
    exec: async (cmd, args, opts) => {
      const command = Command.create(cmd, args, { cwd: opts?.cwd, env: opts?.env });
      const output = await command.execute();
      return {
        code: output.code ?? 0,
        stdout: output.stdout ?? "",
        stderr: output.stderr ?? "",
      };
    },
  };
}
