import type { Profile } from "@oh-my-git/shared";
import type { GhStatus, LoadState } from "../types";

export function ProfileList({
  profiles,
  status,
  error,
  ghStatus,
  ghUser,
  ghAccounts,
  deletingId,
  syncingId,
  removingKeyId,
  onEdit,
  onDelete,
  onSyncKey,
  onRemoveKey,
}: {
  profiles: Profile[];
  status: LoadState;
  error: string;
  ghStatus: GhStatus;
  ghUser: string;
  ghAccounts: string[];
  deletingId: string | null;
  syncingId: string | null;
  removingKeyId: string | null;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  onSyncKey: (profile: Profile) => void;
  onRemoveKey: (profile: Profile) => void;
}) {
  return (
    <section className="mt-6 grid gap-3">
      {status === "loading" ? (
        <div className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
          Loading profiles...
        </div>
      ) : null}
      {status === "error" ? (
        <div className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-4 py-3 text-sm text-[var(--ink)]">
          Error: {error}
        </div>
      ) : null}
      {status === "ready" && profiles.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
          No profiles yet. Use the button above to create your first one.
        </div>
      ) : null}
      {profiles.map((profile) => (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3"
          key={profile.id}
        >
          <div>
            <div className="text-sm font-semibold text-[var(--ink)]">{profile.label}</div>
            <div className="text-xs text-[var(--muted)]">{profile.git.email}</div>
            {profile.github?.keySyncedAt ? (
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                Key synced {new Date(profile.github.keySyncedAt).toLocaleDateString()}
              </div>
            ) : null}
            {profile.github?.keyTitle ? (
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                Key title: {profile.github.keyTitle}
              </div>
            ) : null}
            {profile.github?.username ? (
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                Linked to @{profile.github.username}
              </div>
            ) : null}
            {ghStatus === "authed" && ghAccounts.length > 0 ? (
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                GH active: {ghUser || "unknown"} · All: {ghAccounts.join(", ")}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-[var(--bg-accent)] px-3 py-1 text-xs font-semibold text-[#6a3d08]">
              {profile.ssh.hostAlias}
            </div>
            {ghStatus === "authed" && !profile.github?.keySyncedAt ? (
              <button
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--ink)]"
                type="button"
                onClick={() => onSyncKey(profile)}
                disabled={syncingId === profile.id}
              >
                {syncingId === profile.id ? "Syncing..." : "Sync key"}
              </button>
            ) : null}
            {ghStatus === "authed" && profile.github?.keySyncedAt ? (
              <button
                className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-600 dark:text-red-200"
                type="button"
                onClick={() => onRemoveKey(profile)}
                disabled={removingKeyId === profile.id}
              >
                {removingKeyId === profile.id ? "Removing..." : "Remove key"}
              </button>
            ) : null}
            <button
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--ink)]"
              type="button"
              onClick={() => onEdit(profile)}
            >
              Edit
            </button>
            <button
              className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-200"
              type="button"
              onClick={() => onDelete(profile)}
              disabled={deletingId === profile.id}
            >
              {deletingId === profile.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
