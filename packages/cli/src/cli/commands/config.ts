import { ensureDirs, getAppDirs, loadConfig, saveConfig } from "@oh-my-git/core";
import type { CAC } from "cac";
import type { CliContext } from "../context";

export function registerConfigCommand(cli: CAC, ctx: CliContext): void {
  cli.command("config init", "Initialize oh-my-git config").action(async () => {
    await ensureDirs(ctx.fs, ctx.env);
    const config = await loadConfig(ctx.fs, ctx.env);
    await saveConfig(ctx.fs, ctx.env, config);
    ctx.log(`Initialized ${getAppDirs(ctx.env).configDir}`);
  });
}
