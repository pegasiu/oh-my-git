import type { ProfileFormState } from "./types";

export const EMPTY_FORM: ProfileFormState = {
  label: "",
  name: "",
  email: "",
  hostAlias: "",
  hostAliasTouched: false,
  ghUser: "",
  mapDir: "",
  generateKey: true,
  keyHash: "",
};
