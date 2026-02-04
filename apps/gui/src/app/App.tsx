import {
  createMapping,
  deleteProfile,
  ensureDirs,
  includeFilePath,
  loadConfig,
  removeGitIncludeMapping,
  removeSshConfig,
  resolvePath,
  saveConfig,
  saveProfile,
  slugify,
  upsertGitIncludeMapping,
  upsertSshConfig,
  writeIncludeFile,
} from "@oh-my-git/core";
import type { Profile } from "@oh-my-git/shared";
import { APP, GITHUB } from "@oh-my-git/shared";
import { Moon, Sun } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadTauriAdapters, loadTauriShell } from "../lib/tauri-adapter";
import { Header } from "./components/Header";
import { ProfileFormModal } from "./components/ProfileFormModal";
import { ProfileList } from "./components/ProfileList";
import { StatusCards } from "./components/StatusCards";
import { EMPTY_FORM } from "./constants";
import { useGhStatus } from "./hooks/use-gh-status";
import { useProfiles } from "./hooks/use-profiles";
import type { ProfileFormState } from "./types";
import { generateKeyHash } from "./utils/crypto";
import { findKeyByMaterial } from "./utils/keys";
import { autoHostAlias, isAutoHostAlias, previewKeyPath, uniqueProfileId } from "./utils/profile";

export function App() {
  const { profiles, status, error, setError, setStatus, refreshProfiles } = useProfiles();
  const { ghStatus, ghUser, ghAccounts } = useGhStatus();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [removingKeyId, setRemovingKeyId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("omg-theme");
    return stored === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("omg-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!showForm) return;
    if (ghStatus !== "authed" || ghAccounts.length === 0) return;
    if (form.ghUser.trim()) return;
    const fallback = ghUser || ghAccounts[0];
    if (!fallback) return;
    setForm((prev) => ({ ...prev, ghUser: fallback }));
  }, [showForm, ghStatus, ghAccounts, ghUser, form.ghUser]);

  useEffect(() => {
    if (!showForm) return;
    if (form.hostAliasTouched) return;
    const seed = form.label.trim() || form.name.trim() || "profile";
    const nextAlias = autoHostAlias(seed);
    if (nextAlias !== form.hostAlias) {
      setForm((prev) => ({ ...prev, hostAlias: nextAlias }));
    }
  }, [showForm, form.label, form.name, form.hostAliasTouched, form.hostAlias]);

  const previewId = useMemo(() => {
    return slugify(form.label || form.name || "profile");
  }, [form.label, form.name]);

  const previewKey = useMemo(() => {
    return previewKeyPath({ name: form.name, label: form.label, keyHash: form.keyHash });
  }, [form.name, form.label, form.keyHash]);

  const ghAccountOptions = useMemo(() => {
    const unique = new Set(ghAccounts);
    if (form.ghUser) unique.add(form.ghUser);
    return Array.from(unique);
  }, [ghAccounts, form.ghUser]);

  const isEditing = Boolean(editingProfile);
  const displayedKeyPath = isEditing ? (editingProfile?.ssh.keyPath ?? "") : previewKey;
  const editingActionProfile = useMemo(() => {
    if (!editingProfile) return null;
    const trimmedUser = form.ghUser.trim();
    if (!trimmedUser && !editingProfile.github) return editingProfile;
    const github = editingProfile.github
      ? { ...editingProfile.github, username: trimmedUser || undefined }
      : trimmedUser
        ? { username: trimmedUser }
        : undefined;
    return { ...editingProfile, github };
  }, [editingProfile, form.ghUser]);

  function openCreateForm() {
    setForm({
      ...EMPTY_FORM,
      keyHash: generateKeyHash(5),
      ghUser: ghStatus === "authed" ? ghUser : "",
    });
    setFormError("");
    setEditingProfile(null);
    setShowForm(true);
  }

  async function openEditForm(profile: Profile) {
    try {
      const { env, fs } = await loadTauriAdapters();
      const config = await loadConfig(fs, env);
      const mapping = config.mappings.find((item) => item.profileId === profile.id);
      setForm({
        label: profile.label,
        name: profile.git.name,
        email: profile.git.email,
        hostAlias: profile.ssh.hostAlias,
        hostAliasTouched: !isAutoHostAlias(profile),
        ghUser: profile.github?.username || "",
        mapDir: mapping?.path || "",
        generateKey: false,
        keyHash: generateKeyHash(5),
      });
      setEditingProfile(profile);
      setFormError("");
      setShowForm(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      setShowForm(true);
    }
  }

  function closeForm() {
    setShowForm(false);
    setFormError("");
    setEditingProfile(null);
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    if (!form.label.trim() || !form.name.trim() || !form.email.trim()) {
      setFormError("Uzupełnij: label, name, email.");
      return;
    }
    if (ghStatus !== "authed") {
      setFormError("Zaloguj się do GitHub CLI (`gh auth login`), aby zapisać profil.");
      return;
    }
    if (!form.ghUser.trim()) {
      setFormError("Wybierz konto GitHub z listy.");
      return;
    }

    setSaving(true);
    try {
      const { env, fs } = await loadTauriAdapters();
      await ensureDirs(fs, env);
      const config = await loadConfig(fs, env);

      const now = new Date().toISOString();
      const isCreate = !editingProfile;

      let id: string;
      let keyPathInput: string;
      let createdAt: string;
      let editingIdForHost = "";

      if (editingProfile) {
        id = editingProfile.id;
        keyPathInput = editingProfile.ssh.keyPath;
        createdAt = editingProfile.createdAt;
        editingIdForHost = editingProfile.id;
      } else {
        id = uniqueProfileId(slugify(form.label), config);
        keyPathInput = previewKey;
        createdAt = now;
      }

      const hostAlias =
        form.hostAlias.trim() || autoHostAlias(form.label || form.name || editingIdForHost || id);
      const keyPath = resolvePath(keyPathInput, env);

      if (isCreate && form.generateKey) {
        const shell = await loadTauriShell();
        if (await fs.exists(keyPath)) {
          throw new Error(`SSH key already exists at ${keyPathInput}`);
        }
        const result = await shell.exec("ssh-keygen", [
          "-t",
          "ed25519",
          "-f",
          keyPath,
          "-C",
          form.email.trim(),
          "-N",
          "",
        ]);
        if (result.code !== 0) {
          throw new Error(result.stderr || result.stdout || "ssh-keygen failed");
        }
      }

      const resolvedGhUser = form.ghUser.trim();

      const profile: Profile = {
        id,
        label: form.label.trim(),
        git: { name: form.name.trim(), email: form.email.trim() },
        ssh: { keyPath, hostAlias },
        github: (() => {
          const trimmedUser = resolvedGhUser;
          if (isCreate) {
            return trimmedUser ? { username: trimmedUser } : undefined;
          }
          if (editingProfile?.github) {
            return { ...editingProfile.github, username: trimmedUser || undefined };
          }
          return trimmedUser ? { username: trimmedUser } : undefined;
        })(),
        createdAt,
        updatedAt: now,
      };

      await saveProfile(fs, env, profile);
      await upsertSshConfig(fs, env, profile);
      await writeIncludeFile(fs, env, profile);

      if (isCreate && !config.profiles.includes(id)) {
        config.profiles.push(id);
      }

      const mappingsToRemove = config.mappings.filter((item) => item.profileId === id);
      for (const mapping of mappingsToRemove) {
        await removeGitIncludeMapping(fs, env, mapping.id);
      }
      config.mappings = config.mappings.filter((item) => item.profileId !== id);

      if (form.mapDir.trim()) {
        const resolved = resolvePath(form.mapDir.trim(), env);
        const mapping = createMapping(resolved, id);
        config.mappings = config.mappings.filter((item) => item.path !== mapping.path);
        config.mappings.push(mapping);
        await upsertGitIncludeMapping(fs, env, mapping);
      }

      await saveConfig(fs, env, config);
      await refreshProfiles();
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingProfile(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProfile(profile: Profile) {
    try {
      setDeletingId(profile.id);
      const { env, fs } = await loadTauriAdapters();
      const config = await loadConfig(fs, env);
      const mappings = config.mappings.filter((item) => item.profileId === profile.id);
      for (const mapping of mappings) {
        await removeGitIncludeMapping(fs, env, mapping.id);
      }
      config.mappings = config.mappings.filter((item) => item.profileId !== profile.id);
      config.profiles = config.profiles.filter((pid) => pid !== profile.id);
      await removeSshConfig(fs, env, profile.id);
      const includePath = includeFilePath(env, profile.id);
      if (fs.remove) await fs.remove(includePath);
      await deleteProfile(fs, env, profile.id);
      await saveConfig(fs, env, config);
      await refreshProfiles();
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSyncKey(profile: Profile) {
    try {
      setSyncingId(profile.id);
      const { env, fs } = await loadTauriAdapters();
      if (ghStatus !== "authed") {
        throw new Error("GitHub CLI not authenticated. Run `gh auth login`.");
      }
      const pubPath = `${profile.ssh.keyPath}.pub`;
      if (!(await fs.exists(pubPath))) {
        throw new Error(`Public key not found: ${pubPath}`);
      }

      const shell = await loadTauriShell();
      if (profile.github?.username) {
        const switchResult = await shell.exec("gh", [
          "auth",
          "switch",
          "--hostname",
          GITHUB.host,
          "--user",
          profile.github.username,
        ]);
        if (switchResult.code !== 0) {
          throw new Error(
            switchResult.stderr ||
              switchResult.stdout ||
              `Failed to switch gh account to ${profile.github.username}`,
          );
        }
      }

      const pubContent = await fs.readFile(pubPath);
      const existing = await findKeyByMaterial(shell, pubContent);
      if (existing) {
        const now = new Date().toISOString();
        const updated: Profile = {
          ...profile,
          github: {
            ...profile.github,
            keyId: existing.id,
            keyTitle: existing.title,
            keySyncedAt: now,
          },
          updatedAt: now,
        };
        await saveProfile(fs, env, updated);
        await refreshProfiles();
        if (editingProfile?.id === profile.id) setEditingProfile(updated);
        setError("");
        setStatus("ready");
        return;
      }

      const title = `${APP.name} ${profile.label} ${new Date().toISOString().slice(0, 10)}`;
      const result = await shell.exec("gh", ["ssh-key", "add", pubPath, "--title", title]);
      if (result.code !== 0) {
        throw new Error(result.stderr || result.stdout || "Failed to add SSH key");
      }

      const added = await findKeyByMaterial(shell, pubContent);
      const keyId = added?.id ?? profile.github?.keyId;
      const keyTitle = added?.title ?? title;

      const now = new Date().toISOString();
      const updated: Profile = {
        ...profile,
        github: {
          ...profile.github,
          keyId,
          keyTitle,
          keySyncedAt: now,
        },
        updatedAt: now,
      };
      await saveProfile(fs, env, updated);
      await refreshProfiles();
      if (editingProfile?.id === profile.id) setEditingProfile(updated);
      setError("");
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleRemoveKey(profile: Profile) {
    try {
      setRemovingKeyId(profile.id);
      const { env, fs } = await loadTauriAdapters();
      if (ghStatus !== "authed") {
        throw new Error("GitHub CLI not authenticated. Run `gh auth login`.");
      }
      const pubPath = `${profile.ssh.keyPath}.pub`;
      const shell = await loadTauriShell();
      if (profile.github?.username) {
        const switchResult = await shell.exec("gh", [
          "auth",
          "switch",
          "--hostname",
          GITHUB.host,
          "--user",
          profile.github.username,
        ]);
        if (switchResult.code !== 0) {
          throw new Error(
            switchResult.stderr ||
              switchResult.stdout ||
              `Failed to switch gh account to ${profile.github.username}`,
          );
        }
      }

      let keyId = profile.github?.keyId ?? null;
      if (!keyId && (await fs.exists(pubPath))) {
        const pubContent = await fs.readFile(pubPath);
        const existing = await findKeyByMaterial(shell, pubContent);
        keyId = existing?.id ?? null;
      }

      if (!keyId) {
        throw new Error("Could not determine key ID for removal.");
      }

      const result = await shell.exec("gh", ["ssh-key", "delete", String(keyId), "--yes"]);
      if (result.code !== 0) {
        throw new Error(result.stderr || result.stdout || "Failed to delete SSH key");
      }

      const now = new Date().toISOString();
      const updated: Profile = {
        ...profile,
        github: {
          ...profile.github,
          keyId: undefined,
          keyTitle: undefined,
          keySyncedAt: undefined,
        },
        updatedAt: now,
      };
      await saveProfile(fs, env, updated);
      await refreshProfiles();
      if (editingProfile?.id === profile.id) setEditingProfile(updated);
      setError("");
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      setRemovingKeyId(null);
    }
  }

  const updateForm = useCallback((patch: Partial<ProfileFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <div className="min-h-screen w-full">
      <button
        className="fixed right-6 top-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white/80 text-[var(--ink)] shadow-sm transition hover:shadow-md dark:bg-black/30"
        type="button"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        aria-label={theme === "light" ? "Enable dark mode" : "Enable light mode"}
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-8">
        <div className="relative w-full rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.15)]">
          <Header onAdd={openCreateForm} />
          <StatusCards ghStatus={ghStatus} ghUser={ghUser} ghAccounts={ghAccounts} />
          <ProfileList
            profiles={profiles}
            status={status}
            error={error}
            ghStatus={ghStatus}
            ghUser={ghUser}
            ghAccounts={ghAccounts}
            deletingId={deletingId}
            syncingId={syncingId}
            removingKeyId={removingKeyId}
            onEdit={openEditForm}
            onDelete={(profile) => void handleDeleteProfile(profile)}
            onSyncKey={(profile) => void handleSyncKey(profile)}
            onRemoveKey={(profile) => void handleRemoveKey(profile)}
          />
        </div>
      </div>

      <ProfileFormModal
        isOpen={showForm}
        isEditing={isEditing}
        form={form}
        formError={formError}
        saving={saving}
        ghStatus={ghStatus}
        ghAccounts={ghAccounts}
        ghUser={ghUser}
        previewId={previewId}
        previewKeyPath={previewKey}
        displayedKeyPath={displayedKeyPath}
        ghAccountOptions={ghAccountOptions}
        editingActionProfile={editingActionProfile}
        syncingId={syncingId}
        removingKeyId={removingKeyId}
        onClose={closeForm}
        onSubmit={handleSaveProfile}
        onUpdateForm={updateForm}
        onSyncKey={(profile) => void handleSyncKey(profile)}
        onRemoveKey={(profile) => void handleRemoveKey(profile)}
      />
    </div>
  );
}
