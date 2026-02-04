import { APP } from "./constants";
import type { AppDirs, EnvAdapter } from "./types";

export function joinPath(...parts: string[]): string {
  const cleaned = parts
    .filter((part) => part && part.length > 0)
    .map((part, index) => {
      if (index === 0) {
        const trimmed = part.replace(/\/+$/g, "");
        return trimmed === "" ? "/" : trimmed;
      }
      return part.replace(/^\/+|\/+$/g, "");
    });
  if (cleaned.length === 0) return "";
  return cleaned.join("/") || "/";
}

export function ensureTrailingSlash(path: string): string {
  if (path.endsWith("/")) return path;
  return `${path}/`;
}

export function expandHome(path: string, homeDir: string): string {
  if (path === "~") return homeDir;
  if (path.startsWith("~/")) return joinPath(homeDir, path.slice(2));
  return path;
}

export function resolvePath(path: string, env: EnvAdapter): string {
  if (!path) return path;
  if (path.startsWith("/")) return path;
  const expanded = expandHome(path, env.homeDir);
  if (expanded.startsWith("/")) return expanded;
  const base = env.cwd || env.homeDir;
  return joinPath(base, expanded);
}

export function toHomeShortcut(path: string, homeDir: string): string {
  if (path === homeDir) return "~";
  if (path.startsWith(`${homeDir}/`)) {
    return `~/${path.slice(homeDir.length + 1)}`;
  }
  return path;
}

export function getAppDirs(env: EnvAdapter): AppDirs {
  const configDir = env.configDir || joinPath(env.homeDir, ".config", APP.name);
  return {
    configDir,
    profilesDir: joinPath(configDir, "profiles"),
    includesDir: joinPath(configDir, "includes"),
    backupsDir: joinPath(configDir, "backups"),
  };
}

export function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}
