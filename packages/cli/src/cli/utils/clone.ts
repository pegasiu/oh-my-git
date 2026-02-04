import type { Profile } from "@oh-my-git/shared";
import { GITHUB } from "@oh-my-git/shared";

export type SshRepo = {
  kind: "scp" | "url";
  host: string;
  path: string;
  username: string;
};

export function parseSshRepo(repo: string): SshRepo | null {
  if (repo.startsWith("git@")) {
    const match = repo.match(/^git@([^:]+):(.+)$/);
    if (!match) return null;
    return { kind: "scp", host: match[1], path: match[2], username: GITHUB.sshUser };
  }
  if (repo.startsWith("ssh://")) {
    try {
      const url = new URL(repo);
      if (url.protocol !== "ssh:") return null;
      const host = url.hostname;
      const path = url.pathname.replace(/^\//, "");
      const username = url.username || GITHUB.sshUser;
      return { kind: "url", host, path, username };
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeCloneUrl(
  repo: string,
  profile: Profile,
): { url: string; repoName: string } {
  const parsed = parseSshRepo(repo);
  if (!parsed) {
    throw new Error(
      `Only SSH clone URLs are supported. Use git@${GITHUB.host}:owner/repo.git or ssh://${GITHUB.sshUser}@${GITHUB.host}/owner/repo.git.`,
    );
  }
  const hostAlias = profile.ssh.hostAlias;
  if (parsed.host !== GITHUB.host && parsed.host !== hostAlias) {
    throw new Error(`Only ${GITHUB.host} SSH URLs are supported for now.`);
  }
  const repoName =
    parsed.path
      .split("/")
      .pop()
      ?.replace(/\.git$/, "") || "repo";
  const host = hostAlias;
  if (parsed.host === hostAlias) {
    return { url: repo, repoName };
  }
  if (parsed.kind === "scp") {
    return { url: `${GITHUB.sshUser}@${host}:${parsed.path}`, repoName };
  }
  return { url: `ssh://${parsed.username}@${host}/${parsed.path}`, repoName };
}

function isSshLike(value: string): boolean {
  return value.startsWith("git@") || value.startsWith("ssh://");
}

export function parseCloneArgs(
  repoInput: string | string[],
  dirFlag?: string,
): { repo: string; dir?: string } {
  if (!Array.isArray(repoInput)) {
    return { repo: repoInput, dir: dirFlag };
  }

  const parts = repoInput.filter(Boolean);
  let repoIndex = -1;
  for (let i = 0; i < parts.length; i += 1) {
    if (isSshLike(parts[i])) {
      repoIndex = i;
    }
  }

  if (repoIndex === -1) {
    return { repo: parts[0] ?? "", dir: dirFlag };
  }

  const repo = parts[repoIndex];
  let dir = dirFlag;
  if (!dir) {
    for (let i = repoIndex + 1; i < parts.length; i += 1) {
      if (!isSshLike(parts[i])) {
        dir = parts[i];
        break;
      }
    }
  }

  return { repo, dir };
}
