import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(rootDir, "build");
const outputDir = path.join(buildDir, "oh-my-git");
const cliDir = path.join(rootDir, "packages", "cli");
const guiDir = path.join(rootDir, "apps", "gui");
const appName = "oh-my-git";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit", ...opts });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

async function buildGui() {
  const platform = process.platform;
  let bundles;
  if (platform === "darwin") {
    bundles = ["app"];
  } else if (platform === "linux") {
    bundles = ["appimage"];
  } else {
    throw new Error("Release build is only supported on macOS and Linux.");
  }

  await run("bun", ["run", "--cwd", guiDir, "tauri", "build", "--bundles", ...bundles]);
}

async function buildCli() {
  await run("bun", ["run", "--cwd", cliDir, "build"]);
}

async function copyGuiBundle() {
  const platform = process.platform;
  let srcPath;
  let destPath;
  if (platform === "darwin") {
    srcPath = path.join(
      guiDir,
      "src-tauri",
      "target",
      "release",
      "bundle",
      "macos",
      `${appName}.app`,
    );
    destPath = path.join(outputDir, "gui", "macos", `${appName}.app`);
  } else if (platform === "linux") {
    const appImageDir = path.join(
      guiDir,
      "src-tauri",
      "target",
      "release",
      "bundle",
      "appimage",
    );
    const candidates = (await readdir(appImageDir)).filter(
      (entry) => entry.startsWith(appName) && entry.endsWith(".AppImage"),
    );
    if (candidates.length === 0) {
      throw new Error(`No AppImage found in ${appImageDir}`);
    }
    srcPath = path.join(appImageDir, candidates[0]);
    destPath = path.join(outputDir, "gui", "linux", `${appName}.AppImage`);
  } else {
    throw new Error("Release build is only supported on macOS and Linux.");
  }

  await mkdir(path.dirname(destPath), { recursive: true });
  await cp(srcPath, destPath, { recursive: true, force: true });
}

async function writePackageJson() {
  const cliPkg = JSON.parse(await readFile(path.join(cliDir, "package.json"), "utf8"));
  const rootPkg = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));

  const outputPkg = {
    name: rootPkg.name ?? cliPkg.name,
    version: rootPkg.version ?? cliPkg.version,
    type: "module",
    bin: cliPkg.bin,
    description: rootPkg.description ?? cliPkg.description,
    license: rootPkg.license ?? cliPkg.license,
    files: ["dist", "bin", "gui", "README.md"],
  };

  await writeFile(
    path.join(outputDir, "package.json"),
    `${JSON.stringify(outputPkg, null, 2)}\n`,
  );
}

async function copyCliArtifacts() {
  await cp(path.join(cliDir, "dist"), path.join(outputDir, "dist"), {
    recursive: true,
    force: true,
  });
  await cp(path.join(cliDir, "bin"), path.join(outputDir, "bin"), {
    recursive: true,
    force: true,
  });
}

async function copyReadme() {
  await cp(path.join(rootDir, "README.md"), path.join(outputDir, "README.md"), {
    force: true,
  });
}

async function main() {
  await rm(buildDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await buildGui();
  await buildCli();

  await copyCliArtifacts();
  await copyGuiBundle();
  await copyReadme();
  await writePackageJson();
  console.log(`Release package ready: ${outputDir}`);
}

await main();
