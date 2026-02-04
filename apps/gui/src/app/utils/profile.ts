import { slugify } from "@oh-my-git/core";
import type { AppConfig, Profile } from "@oh-my-git/shared";
import { buildHostAlias } from "@oh-my-git/shared";

export function uniqueProfileId(baseId: string, config: AppConfig): string {
  let candidate = baseId;
  let index = 2;
  while (config.profiles.includes(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
}

export function autoHostAlias(seed: string): string {
  return buildHostAlias(slugify(seed || "profile"));
}

export function isAutoHostAlias(profile: Profile): boolean {
  const labelAlias = autoHostAlias(profile.label);
  return (
    profile.ssh.hostAlias === labelAlias || profile.ssh.hostAlias === buildHostAlias(profile.id)
  );
}

export function previewKeyPath({
  name,
  label,
  keyHash,
}: {
  name: string;
  label: string;
  keyHash: string;
}): string {
  const nameSeed = name.trim() || label.trim() || "profile";
  const hash = (keyHash || "temp").slice(0, 6);
  return `~/.ssh/id_ed25519_${slugify(nameSeed)}-${hash}`;
}
