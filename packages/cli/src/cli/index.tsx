import { applyProfileToRepo, ensureDirs, loadConfig } from "@oh-my-git/core";
import type { AppConfig } from "@oh-my-git/shared";
import { cac } from "cac";
import { render } from "ink";
import { App } from "../ui/App";
import { registerCloneCommands } from "./commands/clone";
import { registerConfigCommand } from "./commands/config";
import { registerDirCommands } from "./commands/dir";
import { registerGhCommands } from "./commands/gh";
import { registerGuiCommand } from "./commands/gui";
import { registerProfileCommands } from "./commands/profile";
import { registerRepoCommands } from "./commands/repo";
import { registerSshCommands } from "./commands/ssh";
import { registerStatusCommand } from "./commands/status";
import type { CliDeps } from "./context";
import { createCliContext } from "./context";
import { loadProfiles } from "./services/profiles";

const ALIAS_PATTERNS: string[][] = [
  ["config", "init"],
  ["profile", "add"],
  ["profile", "list"],
  ["profile", "remove"],
  ["dir", "map"],
  ["dir", "list"],
  ["dir", "unmap"],
  ["repo", "use"],
  ["ssh", "test"],
  ["gh", "login"],
  ["gh", "switch"],
  ["gh", "link"],
  ["gh", "key", "add"],
  ["gh", "key", "remove"],
];

function normalizeCliArgv(argv: string[]): string[] {
  const prefix = argv.slice(0, 2);
  const args = argv.slice(2);
  if (args.length === 0) return argv;

  for (const pattern of ALIAS_PATTERNS) {
    const matches = pattern.every((part, index) => args[index] === part);
    if (matches) {
      const combined = pattern.join(" ");
      return [...prefix, combined, ...args.slice(pattern.length)];
    }
  }

  return argv;
}

export function createCli(deps: CliDeps) {
  const ctx = createCliContext(deps);

  async function loadProfilesForTui(config: AppConfig) {
    return loadProfiles(ctx.fs, ctx.env, config);
  }

  async function runTui(repoPath: string): Promise<void> {
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    const profiles = await loadProfilesForTui(config);
    render(
      <App
        profiles={profiles}
        repoPath={repoPath}
        onSelect={async (profile) => {
          await applyProfileToRepo(ctx.shell, profile, repoPath);
        }}
      />,
    );
  }

  async function runCli(argv: string[]): Promise<void> {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes("--tui")) {
      await runTui(ctx.env.cwd || process.cwd());
      return;
    }

    const cli = cac("omg");

    registerConfigCommand(cli, ctx);
    registerStatusCommand(cli, ctx);
    registerGuiCommand(cli, ctx);
    registerCloneCommands(cli, ctx);
    registerProfileCommands(cli, ctx);
    registerDirCommands(cli, ctx);
    registerRepoCommands(cli, ctx);
    registerSshCommands(cli, ctx);
    registerGhCommands(cli, ctx);

    cli.help();
    const normalizedArgv = normalizeCliArgv(argv);
    cli.parse(normalizedArgv, { run: false });
    type CliRunner = { runMatchedCommand?: () => unknown };
    const result = (cli as CliRunner).runMatchedCommand?.();
    if (result instanceof Promise) {
      await result;
    }
  }

  return { runCli };
}
