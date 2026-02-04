import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ensureTrailingSlash,
  gitConfigPath,
  includeFilePath,
  loadConfig,
  loadProfile,
  sshConfigPath,
} from "@oh-my-git/core";
import { createCli } from "./cli/index.tsx";
import {
  TEST_HOST_ALIASES,
  TEST_REPO_SSH,
  TEST_REPO_SSH_PERSONAL,
  TEST_REPO_SSH_WORK,
} from "./test-fixtures";
import { createTestContext } from "./test-utils.ts";

async function setup() {
  const ctx = await createTestContext();
  const cli = createCli({
    fs: ctx.fs,
    env: ctx.env,
    shell: ctx.shell,
    logger: ctx.logger,
    now: () => ctx.now,
  });
  return { ...ctx, cli };
}

describe("cli commands", () => {
  test("config init creates config file", async () => {
    const ctx = await setup();
    try {
      await ctx.cli.runCli(["node", "omg", "config", "init"]);
      const config = await loadConfig(ctx.fs, ctx.env);
      expect(config.profiles).toEqual([]);
      expect(ctx.logs.some((line) => line.includes("Initialized"))).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });

  test("profile and dir commands update config and files", async () => {
    const ctx = await setup();
    try {
      await ctx.cli.runCli([
        "node",
        "omg",
        "profile",
        "add",
        "--id",
        "work",
        "--label",
        "Work",
        "--name",
        "Jane Doe",
        "--email",
        "jane@work.com",
        "--host-alias",
        TEST_HOST_ALIASES.work,
        "--key-path",
        "~/.ssh/id_ed25519_work",
      ]);

      const profile = await loadProfile(ctx.fs, ctx.env, "work");
      expect(profile?.git.name).toBe("Jane Doe");
      expect(profile?.ssh.hostAlias).toBe(TEST_HOST_ALIASES.work);

      const sshConfig = await ctx.fs.readFile(sshConfigPath(ctx.env));
      expect(sshConfig).toContain(`Host ${TEST_HOST_ALIASES.work}`);
      const includePath = includeFilePath(ctx.env, "work");
      const includeFile = await ctx.fs.readFile(includePath);
      expect(includeFile).toContain("name = Jane Doe");
      expect(includeFile).toContain("email = jane@work.com");

      ctx.logs.length = 0;
      await ctx.cli.runCli(["node", "omg", "profile", "list"]);
      expect(ctx.logs.join("\n")).toContain("work (Jane Doe <jane@work.com>)");

      const mapPath = path.join(ctx.env.cwd || "", "projects", "work");
      await ctx.cli.runCli(["node", "omg", "dir", "map", mapPath, "work"]);
      const configAfterMap = await loadConfig(ctx.fs, ctx.env);
      expect(configAfterMap.mappings.length).toBe(1);
      expect(configAfterMap.mappings[0].path).toBe(ensureTrailingSlash(mapPath));

      const gitConfig = await ctx.fs.readFile(gitConfigPath(ctx.env));
      expect(gitConfig).toContain(`gitdir:${ensureTrailingSlash(mapPath)}`);

      ctx.logs.length = 0;
      await ctx.cli.runCli(["node", "omg", "status"]);
      expect(ctx.logs.join("\n")).toContain("Profiles:");
      expect(ctx.logs.join("\n")).toContain("Mappings:");

      ctx.logs.length = 0;
      await ctx.cli.runCli(["node", "omg", "dir", "list"]);
      expect(ctx.logs.join("\n")).toContain("-> work");

      const mappingId = configAfterMap.mappings[0]?.id;
      await ctx.cli.runCli(["node", "omg", "dir", "unmap", mappingId]);
      const configAfterUnmap = await loadConfig(ctx.fs, ctx.env);
      expect(configAfterUnmap.mappings.length).toBe(0);

      await ctx.cli.runCli(["node", "omg", "profile", "remove", "work"]);
      const profileAfter = await loadProfile(ctx.fs, ctx.env, "work");
      expect(profileAfter).toBeNull();
    } finally {
      await ctx.cleanup();
    }
  });

  test("repo use applies profile identity", async () => {
    const ctx = await setup();
    try {
      await ctx.cli.runCli([
        "node",
        "omg",
        "profile",
        "add",
        "--id",
        "work",
        "--label",
        "Work",
        "--name",
        "Jane Doe",
        "--email",
        "jane@work.com",
      ]);

      const repoPath = path.join(ctx.env.cwd || "", "repo-use");
      await ctx.cli.runCli(["node", "omg", "repo", "use", "work", repoPath]);

      const repo = ctx.shell.getRepo(repoPath);
      expect(repo?.config["user.name"]).toBe("Jane Doe");
      expect(repo?.config["user.email"]).toBe("jane@work.com");
    } finally {
      await ctx.cleanup();
    }
  });

  test("workflow clones repo with two profiles and validates identity", async () => {
    const ctx = await setup();
    try {
      await ctx.cli.runCli([
        "node",
        "omg",
        "profile",
        "add",
        "--id",
        "work",
        "--label",
        "Work",
        "--name",
        "Jane Doe",
        "--email",
        "jane@work.com",
        "--host-alias",
        TEST_HOST_ALIASES.work,
      ]);
      await ctx.cli.runCli([
        "node",
        "omg",
        "profile",
        "add",
        "--id",
        "personal",
        "--label",
        "Personal",
        "--name",
        "John Doe",
        "--email",
        "john@home.com",
        "--host-alias",
        TEST_HOST_ALIASES.personal,
      ]);

      await ctx.cli.runCli(["node", "omg", "gh", "link", "work", "work-user"]);
      await ctx.cli.runCli(["node", "omg", "gh", "link", "personal", "personal-user"]);

      const repo = TEST_REPO_SSH;

      await ctx.cli.runCli([
        "node",
        "omg",
        "clone",
        repo,
        "--profile",
        "work",
        "--dir",
        "repo-work",
      ]);
      const workPath = path.join(ctx.env.cwd || "", "repo-work");
      const workRepo = ctx.shell.getRepo(workPath);
      expect(workRepo?.remotes.origin).toBe(TEST_REPO_SSH_WORK);
      expect(workRepo?.config["user.name"]).toBe("Jane Doe");
      expect(workRepo?.config["user.email"]).toBe("jane@work.com");

      await ctx.cli.runCli([
        "node",
        "omg",
        "init",
        repo,
        "--profile",
        "personal",
        "--dir",
        "repo-personal",
      ]);
      const personalPath = path.join(ctx.env.cwd || "", "repo-personal");
      const personalRepo = ctx.shell.getRepo(personalPath);
      expect(personalRepo?.remotes.origin).toBe(TEST_REPO_SSH_PERSONAL);
      expect(personalRepo?.config["user.name"]).toBe("John Doe");
      expect(personalRepo?.config["user.email"]).toBe("john@home.com");
    } finally {
      await ctx.cleanup();
    }
  });

  test("gh and ssh commands work with stubbed accounts and keys", async () => {
    const ctx = await setup();
    try {
      await ctx.cli.runCli([
        "node",
        "omg",
        "profile",
        "add",
        "--id",
        "work",
        "--label",
        "Work",
        "--name",
        "Jane Doe",
        "--email",
        "jane@work.com",
        "--host-alias",
        TEST_HOST_ALIASES.work,
        "--gh-user",
        "janew",
        "--key-path",
        "~/.ssh/id_ed25519_work",
      ]);

      const profile = await loadProfile(ctx.fs, ctx.env, "work");
      expect(profile).not.toBeNull();
      if (!profile) throw new Error("Profile not created.");
      const pubKeyPath = `${profile.ssh.keyPath}.pub`;
      await writeFile(pubKeyPath, "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAB test@example.com");

      ctx.shell.ghAccounts = ["janew"];
      ctx.shell.ghActive = "janew";

      await ctx.cli.runCli(["node", "omg", "gh", "login", "work"]);
      expect(
        ctx.shell.calls.some(
          (call) => call.cmd === "gh" && call.args[0] === "auth" && call.args[1] === "login",
        ),
      ).toBe(true);

      await ctx.cli.runCli(["node", "omg", "gh", "switch", "work"]);
      expect(
        ctx.shell.calls.some(
          (call) => call.cmd === "gh" && call.args[0] === "auth" && call.args[1] === "switch",
        ),
      ).toBe(true);

      await ctx.cli.runCli(["node", "omg", "gh", "link", "work", "janew"]);
      const linked = await loadProfile(ctx.fs, ctx.env, "work");
      expect(linked?.github?.username).toBe("janew");

      await ctx.cli.runCli(["node", "omg", "gh", "key", "add", "work"]);
      const afterAdd = await loadProfile(ctx.fs, ctx.env, "work");
      expect(afterAdd?.github?.keyId).toBeTruthy();
      expect(afterAdd?.github?.keyTitle).toBeTruthy();
      expect(ctx.shell.ghKeys.length).toBe(1);

      await ctx.cli.runCli(["node", "omg", "gh", "key", "remove", "work"]);
      const afterRemove = await loadProfile(ctx.fs, ctx.env, "work");
      expect(afterRemove?.github?.keyId).toBeUndefined();
      expect(ctx.shell.ghKeys.length).toBe(0);

      await ctx.cli.runCli(["node", "omg", "ssh", "test", "work"]);
      expect(ctx.shell.calls.some((call) => call.cmd === "ssh")).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });

  test("gui --dev triggers bun dev command", async () => {
    const ctx = await setup();
    try {
      await ctx.cli.runCli(["node", "omg", "gui", "--dev"]);
      expect(
        ctx.shell.calls.some(
          (call) => call.cmd === "bun" && call.args[0] === "run" && call.args.includes("dev"),
        ),
      ).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });
});
