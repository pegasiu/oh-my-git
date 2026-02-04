import { GITHUB } from "../consts";

export function buildHostAlias(profileId: string): string {
  return `${GITHUB.hostAliasPrefix}${profileId}`;
}

type ScpRepoInput = {
  host?: string;
  owner: string;
  name: string;
  username?: string;
  suffixGit?: boolean;
};

export function buildScpRepoUrl({
  host = GITHUB.host,
  owner,
  name,
  username = GITHUB.sshUser,
  suffixGit = true,
}: ScpRepoInput): string {
  const repoName = suffixGit ? `${name}.git` : name;
  return `${username}@${host}:${owner}/${repoName}`;
}
