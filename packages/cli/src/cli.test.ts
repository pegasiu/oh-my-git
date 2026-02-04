import { describe, expect, test } from "bun:test";
import type { Profile } from "@oh-my-git/shared";
import { buildHostAlias, extractPublicKeyMaterial, GITHUB } from "@oh-my-git/shared";
import { normalizeCloneUrl, parseCloneArgs, parseSshRepo } from "./cli/utils/clone";

function makeProfile(hostAlias = buildHostAlias("work")): Profile {
  const now = new Date().toISOString();
  return {
    id: "work",
    label: "Work",
    git: { name: "Jane Doe", email: "jane@work.com" },
    ssh: { keyPath: "/Users/jane/.ssh/id_ed25519_work", hostAlias },
    createdAt: now,
    updatedAt: now,
  };
}

describe("parseSshRepo", () => {
  test("parses scp-style SSH URLs", () => {
    const parsed = parseSshRepo(`git@${GITHUB.host}:owner/repo.git`);
    expect(parsed).toEqual({
      kind: "scp",
      host: GITHUB.host,
      path: "owner/repo.git",
      username: "git",
    });
  });

  test("parses ssh:// URLs", () => {
    const parsed = parseSshRepo(`ssh://${GITHUB.sshUser}@${GITHUB.host}/owner/repo.git`);
    expect(parsed).toEqual({
      kind: "url",
      host: GITHUB.host,
      path: "owner/repo.git",
      username: "git",
    });
  });

  test("returns null for non-ssh URLs", () => {
    expect(parseSshRepo(`https://${GITHUB.host}/owner/repo.git`)).toBeNull();
  });
});

describe("normalizeCloneUrl", () => {
  test("rewrites github.com host to profile alias", () => {
    const profile = makeProfile(buildHostAlias("work"));
    const result = normalizeCloneUrl(`git@${GITHUB.host}:owner/repo.git`, profile);
    expect(result.url).toBe(`git@${buildHostAlias("work")}:owner/repo.git`);
    expect(result.repoName).toBe("repo");
  });

  test("keeps host alias if already set", () => {
    const profile = makeProfile(buildHostAlias("work"));
    const result = normalizeCloneUrl(`git@${buildHostAlias("work")}:owner/repo.git`, profile);
    expect(result.url).toBe(`git@${buildHostAlias("work")}:owner/repo.git`);
  });

  test("rewrites ssh:// URLs", () => {
    const profile = makeProfile(buildHostAlias("work"));
    const result = normalizeCloneUrl(
      `ssh://${GITHUB.sshUser}@${GITHUB.host}/owner/repo.git`,
      profile,
    );
    expect(result.url).toBe(`ssh://${GITHUB.sshUser}@${buildHostAlias("work")}/owner/repo.git`);
  });

  test("rejects non-github hosts", () => {
    const profile = makeProfile(buildHostAlias("work"));
    expect(() => normalizeCloneUrl("git@bitbucket.org:owner/repo.git", profile)).toThrow(
      `Only ${GITHUB.host} SSH URLs are supported for now.`,
    );
  });
});

describe("parseCloneArgs", () => {
  test("picks repo and dir from positional args", () => {
    const result = parseCloneArgs([`git@${GITHUB.host}:owner/repo.git`, "target-dir"]);
    expect(result).toEqual({ repo: `git@${GITHUB.host}:owner/repo.git`, dir: "target-dir" });
  });

  test("prefers ssh-like arg when extra tokens exist", () => {
    const result = parseCloneArgs(["omg", "init", `git@${GITHUB.host}:owner/repo.git`]);
    expect(result).toEqual({ repo: `git@${GITHUB.host}:owner/repo.git`, dir: undefined });
  });

  test("respects --dir flag override", () => {
    const result = parseCloneArgs(
      [`git@${GITHUB.host}:owner/repo.git`, "ignored-dir"],
      "override-dir",
    );
    expect(result).toEqual({ repo: `git@${GITHUB.host}:owner/repo.git`, dir: "override-dir" });
  });
});

describe("extractPublicKeyMaterial", () => {
  test("drops comment from public key", () => {
    const material = extractPublicKeyMaterial(
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEyX test@example.com",
    );
    expect(material).toBe("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEyX");
  });

  test("returns input when no whitespace", () => {
    expect(extractPublicKeyMaterial("ssh-ed25519")).toBe("ssh-ed25519");
  });
});
