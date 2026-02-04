import { buildHostAlias, buildScpRepoUrl, GITHUB } from "@oh-my-git/shared";

export const TEST_REPO = {
  owner: "githubtraining",
  name: "guided-prompt-engineering-junior",
} as const;

export const TEST_HOST_ALIASES = {
  work: buildHostAlias("work"),
  personal: buildHostAlias("personal"),
} as const;

export const TEST_REPO_SSH = buildScpRepoUrl({
  host: GITHUB.host,
  owner: TEST_REPO.owner,
  name: TEST_REPO.name,
});

export const TEST_REPO_SSH_WORK = buildScpRepoUrl({
  host: TEST_HOST_ALIASES.work,
  owner: TEST_REPO.owner,
  name: TEST_REPO.name,
});

export const TEST_REPO_SSH_PERSONAL = buildScpRepoUrl({
  host: TEST_HOST_ALIASES.personal,
  owner: TEST_REPO.owner,
  name: TEST_REPO.name,
});
