import { GITHUB } from "@oh-my-git/shared";
import { useEffect, useState } from "react";
import { loadTauriShell } from "../../lib/tauri-adapter";
import type { GhStatus } from "../types";
import { normalizeGhText, parseGhStatus } from "../utils/gh";

export function useGhStatus() {
  const [ghStatus, setGhStatus] = useState<GhStatus>("checking");
  const [ghUser, setGhUser] = useState<string>("");
  const [ghAccounts, setGhAccounts] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    async function checkGh() {
      try {
        const shell = await loadTauriShell();
        const result = await shell.exec("gh", ["auth", "status", "--hostname", GITHUB.host]);
        if (!active) return;
        const text = normalizeGhText(`${result.stdout}\n${result.stderr}`);
        const parsed = parseGhStatus(text);
        let accounts = parsed.accounts;
        let activeUser = parsed.activeUser;
        if (accounts.length === 0 && result.code === 0) {
          const who = await shell.exec("gh", ["api", "user"]);
          if (who.code === 0) {
            try {
              const payload = JSON.parse(who.stdout) as { login?: string };
              if (payload.login) {
                accounts = [payload.login];
                if (!activeUser) activeUser = payload.login;
              }
            } catch {
              // ignore json parse issues
            }
          }
        }
        setGhAccounts(accounts);
        setGhUser(activeUser || accounts[0] || "");
        setGhStatus(result.code === 0 ? "authed" : "unauth");
      } catch {
        if (!active) return;
        setGhAccounts([]);
        setGhUser("");
        setGhStatus("unavailable");
      }
    }
    void checkGh();
    return () => {
      active = false;
    };
  }, []);

  return { ghStatus, ghUser, ghAccounts, setGhStatus, setGhUser, setGhAccounts };
}
