export type LoadState = "loading" | "ready" | "error";
export type GhStatus = "checking" | "authed" | "unauth" | "unavailable";

export type ProfileFormState = {
  label: string;
  name: string;
  email: string;
  hostAlias: string;
  hostAliasTouched: boolean;
  ghUser: string;
  mapDir: string;
  generateKey: boolean;
  keyHash: string;
};
