# oh-my-git

CLI + GUI toolkit for managing multiple GitHub identities on a single machine. It creates per‑profile SSH keys, host aliases, and Git include rules so the right identity is used automatically per project.

## Packages
- `packages/shared`: shared types, constants, and small helpers used across CLI, core, and GUI.
- `packages/core`: filesystem + Git/SSH configuration logic.
- `packages/cli`: `omg` CLI + Ink TUI.
- `apps/gui`: Tauri desktop GUI (React).

## How It Works
- Each profile owns its own SSH key and host alias in `~/.ssh/config`.
- Project directories map to profiles via `[includeIf "gitdir:..."]` in `~/.gitconfig`.
- Each include file sets `user.name`, `user.email`, and URL rewrite rules for the profile alias.
- All edits are wrapped in markers so they can be safely updated/removed.

Example managed SSH block:
```text
# >>> oh-my-git:ssh:work
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
  IdentitiesOnly yes
# <<< oh-my-git:ssh:work
```

Example managed Git include:
```text
# >>> oh-my-git:include:work-1a2b3c
[includeIf "gitdir:~/code/work/"]
  path = ~/.config/oh-my-git/includes/work.gitconfig
# <<< oh-my-git:include:work-1a2b3c
```

## Supported Platforms
- macOS ✅
- Linux ✅
- Windows (planned)

## Development
Requirements:
- `bun`
- Rust toolchain + Tauri prerequisites (for GUI builds)

Install deps:
```bash
bun install
```

Run GUI (dev):
```bash
bun run --cwd apps/gui dev
```

Run GUI (web-only):
```bash
bun run --cwd apps/gui dev:web
```

Run CLI unit tests:
```bash
bun run --cwd packages/cli test
```

Run all tests (turbo):
```bash
bun run test
```

Build everything:
```bash
bun run build
```

Build CLI bundle:
```bash
bun run --cwd packages/cli build
```

Build release package (GUI + CLI, output in `build/oh-my-git`):
```bash
bun run release
```

Install the release package globally:
```bash
npm install -g ./build/oh-my-git
```

## CLI Usage
Initialize config:
```bash
omg config init
```

Show status:
```bash
omg status
```

Create profile:
```bash
omg profile add \
  --label Work \
  --name "Jane Doe" \
  --email jane@work.com \
  --generate-key \
  --gh-user janedoe
```

Map directory:
```bash
omg dir map ~/code/work work
```

Apply profile to current repo:
```bash
omg repo use work
```

Test SSH:
```bash
omg ssh test work
```

GitHub CLI helpers:
```bash
omg gh login work
omg gh switch work
omg gh link work
omg gh key add work
omg gh key remove work
```

Clone with profile (SSH only):
```bash
omg clone git@github.com:owner/repo.git
omg clone ssh://git@github.com/owner/repo.git --profile work
omg clone git@github.com:owner/repo.git --dir ~/code/repo
```

Notes:
- `omg clone` rewrites `github.com` to your profile’s host alias.
- Only SSH clone URLs are supported.

## GUI Usage
- Create, edit, and delete profiles
- Generate SSH keys from the form
- Link profile to a GitHub account (from `gh auth status`)
- Edit mappings (per profile)
- Switch light/dark mode
- Sync SSH public key to GitHub (requires `gh auth login`)

Open GUI from CLI (requires a release build in `build/oh-my-git`):
```bash
omg gui
```

Run GUI in dev mode:
```bash
omg gui --dev
```

## Files & Backups
- Config: `~/.config/oh-my-git/config.json`
- Profiles: `~/.config/oh-my-git/profiles/*.json`
- Include files: `~/.config/oh-my-git/includes/*.gitconfig`
- Backups: `~/.config/oh-my-git/backups/*`

## Versioning & Releases
This repo uses Changesets for versioning and release notes.

Add a changeset:
```bash
bun run changeset
```

Bump versions + changelogs:
```bash
bun run version
```

Build release package:
```bash
bun run release
```

Publish to npm (from the release bundle):
```bash
npm publish ./build/oh-my-git
```
