import type { Profile } from "@oh-my-git/shared";
import { GITHUB } from "@oh-my-git/shared";
import { ChevronDown } from "lucide-react";
import type { FormEvent } from "react";
import type { GhStatus, ProfileFormState } from "../types";

export function ProfileFormModal({
  isOpen,
  isEditing,
  form,
  formError,
  saving,
  ghStatus,
  ghAccounts,
  ghUser,
  previewId,
  previewKeyPath,
  displayedKeyPath,
  ghAccountOptions,
  editingActionProfile,
  syncingId,
  removingKeyId,
  onClose,
  onSubmit,
  onUpdateForm,
  onSyncKey,
  onRemoveKey,
}: {
  isOpen: boolean;
  isEditing: boolean;
  form: ProfileFormState;
  formError: string;
  saving: boolean;
  ghStatus: GhStatus;
  ghAccounts: string[];
  ghUser: string;
  previewId: string;
  previewKeyPath: string;
  displayedKeyPath: string;
  ghAccountOptions: string[];
  editingActionProfile: Profile | null;
  syncingId: string | null;
  removingKeyId: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onUpdateForm: (patch: Partial<ProfileFormState>) => void;
  onSyncKey: (profile: Profile) => void;
  onRemoveKey: (profile: Profile) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">
            {isEditing ? "Edit profile" : "New profile"}
          </h2>
          <button
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)]"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Label
            <input
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              value={form.label}
              onChange={(event) => onUpdateForm({ label: event.target.value })}
              placeholder="Work"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Name
            <input
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              value={form.name}
              onChange={(event) => onUpdateForm({ name: event.target.value })}
              placeholder="Jane Doe"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Email
            <input
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              value={form.email}
              onChange={(event) => onUpdateForm({ email: event.target.value })}
              placeholder="jane@company.com"
              required
            />
          </label>
          {!isEditing ? (
            <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={form.generateKey}
                onChange={(event) => onUpdateForm({ generateKey: event.target.checked })}
              />
              Generate new SSH key automatically
            </label>
          ) : null}
          <div className="grid gap-2 text-sm text-[var(--muted)]">
            <span>SSH key path (auto-generated)</span>
            <div className="rounded-xl border border-[var(--border)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] dark:bg-black/20">
              {displayedKeyPath}
            </div>
            <span className="text-xs text-[var(--muted)]">
              {!isEditing && form.generateKey
                ? `Key will be generated at ${previewKeyPath}.`
                : "Key path is managed automatically."}
            </span>
          </div>
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Host alias
            <input
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              value={form.hostAlias}
              onChange={(event) =>
                onUpdateForm({
                  hostAlias: event.target.value,
                  hostAliasTouched: true,
                })
              }
              placeholder={`${GITHUB.hostAliasPrefix}${previewId}`}
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            GitHub account
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 pr-10 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                value={form.ghUser}
                onChange={(event) => onUpdateForm({ ghUser: event.target.value })}
                disabled={ghStatus !== "authed" || ghAccounts.length === 0}
              >
                {ghAccountOptions.length === 0 ? (
                  <option value="">No accounts found</option>
                ) : (
                  ghAccountOptions.map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                size={16}
              />
            </div>
            <span className="text-xs text-[var(--muted)]">
              {ghAccounts.length > 0
                ? `Active: ${ghUser || "unknown"} · All: ${ghAccounts.join(", ")}`
                : "No accounts found."}
              {ghStatus !== "authed" ? " Run `gh auth login` to continue." : ""}
            </span>
          </label>
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Map directory (optional)
            <input
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              value={form.mapDir}
              onChange={(event) => onUpdateForm({ mapDir: event.target.value })}
              placeholder="~/code/work"
            />
          </label>
          {isEditing && ghStatus === "authed" && editingActionProfile ? (
            <div className="grid gap-2 text-sm text-[var(--muted)]">
              <span className="text-sm font-medium text-[var(--ink)]">GitHub key sync</span>
              <div className="flex flex-wrap items-center gap-2">
                {!editingActionProfile.github?.keySyncedAt ? (
                  <button
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)]"
                    type="button"
                    onClick={() => onSyncKey(editingActionProfile)}
                    disabled={syncingId === editingActionProfile.id}
                  >
                    {syncingId === editingActionProfile.id ? "Syncing..." : "Sync key"}
                  </button>
                ) : null}
                {editingActionProfile.github?.keySyncedAt ? (
                  <button
                    className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-200"
                    type="button"
                    onClick={() => onRemoveKey(editingActionProfile)}
                    disabled={removingKeyId === editingActionProfile.id}
                  >
                    {removingKeyId === editingActionProfile.id ? "Removing..." : "Remove key"}
                  </button>
                ) : null}
              </div>
              {editingActionProfile.github?.keySyncedAt ? (
                <span className="text-xs text-[var(--muted)]">
                  Key synced{" "}
                  {new Date(editingActionProfile.github.keySyncedAt).toLocaleDateString()}
                </span>
              ) : null}
              {editingActionProfile.github?.keyTitle ? (
                <span className="text-xs text-[var(--muted)]">
                  Key title: {editingActionProfile.github.keyTitle}
                </span>
              ) : null}
            </div>
          ) : null}
          {formError ? (
            <div className="rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-4 py-3 text-sm text-[var(--ink)]">
              {formError}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink)]"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-70"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : isEditing ? "Save changes" : "Create profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
