import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { EnvAdapter, ExecResult, FsAdapter, ShellAdapter } from "@oh-my-git/shared";
import { APP, extractPublicKeyMaterial, GITHUB } from "@oh-my-git/shared";
import { createNodeFs } from "./adapters/node";

type ExecCall = {
  cmd: string;
  args: string[];
  opts?: { cwd?: string; env?: Record<string, string>; stdio?: "inherit" | "pipe" };
};

type RepoState = {
  config: Record<string, string>;
  remotes: Record<string, string>;
};

type GhKey = { id: number; title: string; key: string };

function repoNameFromUrl(url: string): string {
  const cleaned = url.replace(/\.git$/, "");
  const lastSegment = cleaned.split("/").pop() || cleaned;
  return lastSegment.split(":").pop() || lastSegment;
}

export class TestShell implements ShellAdapter {
  calls: ExecCall[] = [];
  repos = new Map<string, RepoState>();
  ghAccounts: string[] = [];
  ghActive?: string;
  ghKeys: GhKey[] = [];
  nextKeyId = 1000;
  private fs: FsAdapter;
  private cwd: string;

  constructor(opts: { fs: FsAdapter; cwd: string }) {
    this.fs = opts.fs;
    this.cwd = opts.cwd;
  }

  getRepo(pathname: string): RepoState | undefined {
    return this.repos.get(pathname);
  }

  private ensureRepo(pathname: string): RepoState {
    const existing = this.repos.get(pathname);
    if (existing) return existing;
    const repo = { config: {}, remotes: {} };
    this.repos.set(pathname, repo);
    return repo;
  }

  private resolvePath(target: string, base?: string): string {
    if (target.startsWith("/")) return target;
    return path.join(base || this.cwd, target);
  }

  async exec(
    cmd: string,
    args: string[],
    opts?: { cwd?: string; env?: Record<string, string>; stdio?: "inherit" | "pipe" },
  ): Promise<ExecResult> {
    this.calls.push({ cmd, args, opts });
    if (cmd === "git") return this.handleGit(args, opts);
    if (cmd === "gh") return this.handleGh(args);
    if (cmd === "ssh") return { code: 0, stdout: "", stderr: "" };
    if (cmd === "ssh-keygen") return this.handleKeygen(args);
    return { code: 0, stdout: "", stderr: "" };
  }

  private async handleGit(args: string[], opts?: { cwd?: string }): Promise<ExecResult> {
    if (args[0] === "clone") {
      const url = args[1];
      const dir = args[2];
      const target = this.resolvePath(dir || repoNameFromUrl(url), opts?.cwd);
      const repo = this.ensureRepo(target);
      repo.remotes.origin = url;
      return { code: 0, stdout: "", stderr: "" };
    }

    if (args[0] === "-C") {
      const repoPath = args[1];
      const subcommand = args[2];
      const repo = this.ensureRepo(repoPath);

      if (subcommand === "config") {
        if (args[3] === "--get") {
          const key = args[4];
          const value = repo.config[key] || "";
          return value
            ? { code: 0, stdout: `${value}\n`, stderr: "" }
            : { code: 1, stdout: "", stderr: "" };
        }
        const key = args[3];
        const value = args[4] || "";
        repo.config[key] = value;
        return { code: 0, stdout: "", stderr: "" };
      }

      if (subcommand === "remote" && args[3] === "get-url") {
        const name = args[4] || "origin";
        const url = repo.remotes[name];
        return url
          ? { code: 0, stdout: `${url}\n`, stderr: "" }
          : { code: 1, stdout: "", stderr: "" };
      }
    }

    return { code: 0, stdout: "", stderr: "" };
  }

  private async handleGh(args: string[]): Promise<ExecResult> {
    if (args[0] === "--version") {
      return { code: 0, stdout: "gh version 2.0.0\n", stderr: "" };
    }

    if (args[0] === "auth" && args[1] === "status") {
      const accounts = this.ghAccounts.length
        ? this.ghAccounts
        : this.ghActive
          ? [this.ghActive]
          : [];
      const active = this.ghActive || accounts[0];
      const lines = accounts.map((account) => `Logged in to ${GITHUB.host} as ${account}`);
      if (active) lines.push(`Active account: ${active}`);
      return { code: 0, stdout: `${lines.join("\n")}\n`, stderr: "" };
    }

    if (args[0] === "auth" && args[1] === "login") {
      return { code: 0, stdout: "", stderr: "" };
    }

    if (args[0] === "auth" && args[1] === "switch") {
      const userIndex = args.indexOf("--user");
      if (userIndex >= 0) {
        this.ghActive = args[userIndex + 1];
      }
      return { code: 0, stdout: "", stderr: "" };
    }

    if (args[0] === "api" && args[1] === "/user/keys") {
      return { code: 0, stdout: JSON.stringify(this.ghKeys), stderr: "" };
    }

    if (args[0] === "ssh-key" && args[1] === "add") {
      const pubKeyPath = args[2];
      const titleIndex = args.indexOf("--title");
      const title = titleIndex >= 0 ? args[titleIndex + 1] : APP.name;
      const content = await this.fs.readFile(pubKeyPath);
      const material = extractPublicKeyMaterial(content);
      const key = { id: this.nextKeyId++, title, key: material };
      this.ghKeys.push(key);
      return { code: 0, stdout: "", stderr: "" };
    }

    if (args[0] === "ssh-key" && args[1] === "delete") {
      const id = Number(args[2]);
      this.ghKeys = this.ghKeys.filter((item) => item.id !== id);
      return { code: 0, stdout: "", stderr: "" };
    }

    return { code: 0, stdout: "", stderr: "" };
  }

  private async handleKeygen(args: string[]): Promise<ExecResult> {
    const pathIndex = args.indexOf("-f");
    const keyPath = pathIndex >= 0 ? args[pathIndex + 1] : "";
    if (keyPath) {
      await this.fs.writeFile(keyPath, "PRIVATE-KEY");
      await this.fs.writeFile(`${keyPath}.pub`, "ssh-ed25519 AAAATEST test@example.com");
    }
    return { code: 0, stdout: "", stderr: "" };
  }
}

export async function createTestContext(options?: {
  platform?: EnvAdapter["platform"];
  cwd?: string;
  now?: string;
}) {
  const root = await mkdtemp(path.join(tmpdir(), "omg-cli-"));
  const homeDir = path.join(root, "home");
  const cwd = options?.cwd || path.join(root, "workspace");
  await mkdir(homeDir, { recursive: true });
  await mkdir(cwd, { recursive: true });

  const fs = createNodeFs();
  const shell = new TestShell({ fs, cwd });
  const logs: string[] = [];
  const errors: string[] = [];
  const logger = {
    log: (...args: unknown[]) => logs.push(args.map((arg) => String(arg)).join(" ")),
    error: (...args: unknown[]) => errors.push(args.map((arg) => String(arg)).join(" ")),
  };
  const env: EnvAdapter = {
    homeDir,
    cwd,
    platform: options?.platform ?? "darwin",
  };
  const now = options?.now ?? "2024-01-02T03:04:05.000Z";

  const cleanup = async () => {
    await rm(root, { recursive: true, force: true });
  };

  return { root, env, fs, shell, logs, errors, logger, now, cleanup };
}
