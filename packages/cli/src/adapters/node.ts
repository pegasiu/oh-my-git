import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import type { EnvAdapter, ExecResult, FsAdapter, ShellAdapter } from "@oh-my-git/shared";

export function createNodeFs(): FsAdapter {
  return {
    readFile: async (path: string) => fs.readFile(path, "utf8"),
    writeFile: async (path: string, data: string) => {
      await fs.writeFile(path, data, "utf8");
    },
    mkdir: async (path: string, opts?: { recursive?: boolean }) => {
      await fs.mkdir(path, { recursive: Boolean(opts?.recursive) });
    },
    exists: async (path: string) => {
      try {
        await fs.access(path);
        return true;
      } catch {
        return false;
      }
    },
    copyFile: async (src: string, dest: string) => {
      await fs.copyFile(src, dest);
    },
    remove: async (path: string) => {
      await fs.rm(path, { force: true });
    },
  };
}

export function createNodeEnv(): EnvAdapter {
  return {
    homeDir: process.env.HOME || "",
    cwd: process.cwd(),
    platform: process.platform as EnvAdapter["platform"],
  };
}

export function createNodeShell(): ShellAdapter {
  return {
    exec: (
      cmd: string,
      args: string[],
      opts?: { cwd?: string; env?: Record<string, string>; stdio?: "inherit" | "pipe" },
    ) =>
      new Promise<ExecResult>((resolve) => {
        const baseOptions = {
          cwd: opts?.cwd,
          env: { ...process.env, ...opts?.env },
        };

        if (opts?.stdio === "inherit") {
          const child = spawn(cmd, args, { ...baseOptions, stdio: "inherit" });
          child.on("close", (code: number | null) => {
            resolve({ code: code ?? 0, stdout: "", stderr: "" });
          });
          return;
        }

        const child = spawn(cmd, args, {
          ...baseOptions,
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
        child.stderr?.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
        child.on("close", (code: number | null) => {
          resolve({ code: code ?? 0, stdout, stderr });
        });
      }),
  };
}
