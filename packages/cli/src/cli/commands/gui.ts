import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CAC } from "cac";
import type { CliContext } from "../context";
import { getRepoRoot, openGui } from "../services/gui";
import { runCmd } from "../services/run-cmd";

async function resolvePackageRoot(ctx: CliContext): Promise<string> {
  const startDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.resolve(startDir, ".."), path.resolve(startDir, "..", "..", "..")];
  for (const candidate of candidates) {
    if (await ctx.fs.exists(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }
  return path.resolve(startDir, "..");
}

export function registerGuiCommand(cli: CAC, ctx: CliContext): void {
  cli
    .command("gui", "Open the GUI app")
    .option("--dev", "Run GUI in dev mode")
    .action(async (options) => {
      const packageRoot = await resolvePackageRoot(ctx);
      if (options.dev) {
        const repoRoot = await getRepoRoot(ctx.fs, ctx.env, packageRoot);
        if (!repoRoot) {
          throw new Error("GUI source not found. Run this from the repo.");
        }
        await runCmd(
          ctx.shell,
          "bun",
          ["run", "--cwd", path.join(repoRoot, "apps", "gui"), "dev"],
          { stdio: "inherit" },
        );
        return;
      }
      await openGui(ctx.fs, ctx.env, ctx.shell, packageRoot);
    });
}
