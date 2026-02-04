export type Platform = "darwin" | "linux" | "win32";

export interface EnvAdapter {
  homeDir: string;
  configDir?: string;
  cwd?: string;
  platform?: Platform;
}

export interface FsAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  exists(path: string): Promise<boolean>;
  copyFile?(src: string, dest: string): Promise<void>;
  remove?(path: string): Promise<void>;
}

export interface ShellAdapter {
  exec(
    cmd: string,
    args: string[],
    opts?: { cwd?: string; env?: Record<string, string>; stdio?: "inherit" | "pipe" },
  ): Promise<ExecResult>;
}

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface GitIdentity {
  name: string;
  email: string;
}

export interface SshIdentity {
  keyPath: string;
  hostAlias: string;
}

export interface GithubIdentity {
  username?: string;
  keyId?: number;
  keyTitle?: string;
  keySyncedAt?: string;
}

export interface Profile {
  id: string;
  label: string;
  git: GitIdentity;
  ssh: SshIdentity;
  github?: GithubIdentity;
  createdAt: string;
  updatedAt: string;
}

export interface Mapping {
  id: string;
  path: string;
  profileId: string;
}

export interface AppConfig {
  version: 1;
  profiles: string[];
  mappings: Mapping[];
  defaultProfileId?: string;
}

export interface AppDirs {
  configDir: string;
  profilesDir: string;
  includesDir: string;
  backupsDir: string;
}
