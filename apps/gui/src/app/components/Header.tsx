import { APP } from "@oh-my-git/shared";

export function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">{APP.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Switch GitHub identities without leaving your flow.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm"
          type="button"
          onClick={onAdd}
        >
          Add profile
        </button>
      </div>
    </header>
  );
}
