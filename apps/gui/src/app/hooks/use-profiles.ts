import { ensureDirs, loadConfig, loadProfile } from "@oh-my-git/core";
import type { Profile } from "@oh-my-git/shared";
import { useEffect, useState } from "react";
import { loadTauriAdapters } from "../../lib/tauri-adapter";
import type { LoadState } from "../types";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { env, fs } = await loadTauriAdapters();
        await ensureDirs(fs, env);
        const config = await loadConfig(fs, env);
        const loaded: Profile[] = [];
        for (const id of config.profiles) {
          const profile = await loadProfile(fs, env, id);
          if (profile) loaded.push(profile);
        }
        if (!active) return;
        setProfiles(loaded);
        setStatus("ready");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function refreshProfiles() {
    const { env, fs } = await loadTauriAdapters();
    await ensureDirs(fs, env);
    const config = await loadConfig(fs, env);
    const loaded: Profile[] = [];
    for (const id of config.profiles) {
      const profile = await loadProfile(fs, env, id);
      if (profile) loaded.push(profile);
    }
    setProfiles(loaded);
  }

  return {
    profiles,
    status,
    error,
    setError,
    setStatus,
    refreshProfiles,
  };
}
