import type { GhStatus } from "../types";

export function StatusCards({
  ghStatus,
  ghUser,
  ghAccounts,
}: {
  ghStatus: GhStatus;
  ghUser: string;
  ghAccounts: string[];
}) {
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4 shadow-sm dark:bg-black/10">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Profiles</h3>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Each profile owns its own SSH key and Git identity.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4 shadow-sm dark:bg-black/10">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Mappings</h3>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Directory rules automatically apply profiles via includeIf.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4 shadow-sm dark:bg-black/10">
        <h3 className="text-sm font-semibold text-[var(--ink)]">GitHub CLI</h3>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Log in and switch accounts directly from the app.
        </p>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          {ghStatus === "checking"
            ? "Checking authentication..."
            : ghStatus === "authed"
              ? `Connected${ghUser ? ` as ${ghUser}` : ""}.`
              : ghStatus === "unauth"
                ? "Not authenticated. Run `gh auth login`."
                : "GitHub CLI not found."}
        </p>
        {ghAccounts.length > 0 ? (
          <div className="mt-2 text-[11px] text-[var(--muted)]">
            <div>
              {ghStatus === "authed" ? "Active account:" : "Detected account:"}{" "}
              <span className="font-semibold text-[var(--ink)]">{ghUser || "unknown"}</span>
            </div>
            <div>All accounts: {ghAccounts.join(", ")}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
