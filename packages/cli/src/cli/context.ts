import type { EnvAdapter, FsAdapter, ShellAdapter } from "@oh-my-git/shared";

export type CliLogger = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type CliDeps = {
  fs: FsAdapter;
  env: EnvAdapter;
  shell: ShellAdapter;
  logger?: CliLogger;
  now?: () => string;
};

export type CliContext = {
  fs: FsAdapter;
  env: EnvAdapter;
  shell: ShellAdapter;
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  nowIso: () => string;
};

export function createCliContext(deps: CliDeps): CliContext {
  const logger = deps.logger ?? console;
  return {
    fs: deps.fs,
    env: deps.env,
    shell: deps.shell,
    log: (...args: unknown[]) => logger.log(...args),
    error: (...args: unknown[]) => logger.error(...args),
    nowIso: deps.now ?? (() => new Date().toISOString()),
  };
}
