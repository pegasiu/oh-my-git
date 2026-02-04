import { hashString } from "./ids";
import { ensureTrailingSlash } from "./paths";
import type { Mapping } from "./types";

export function createMapping(path: string, profileId: string): Mapping {
  const normalized = ensureTrailingSlash(path);
  const id = `${profileId}-${hashString(normalized)}`;
  return {
    id,
    path: normalized,
    profileId,
  };
}
