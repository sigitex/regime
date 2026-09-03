# Regime Agent Reference

> Filesystem-based configuration management for repositories and packages.

## Locations

- Source: `/sig/regime/src/`
- CLI: `/sig/regime/bin/regime`
- Repository-local template collection: `/sig/regime/templates/`
- Actions: `/sig/regime/actions/`
- Scripts: `/sig/regime/scripts/`

The repository-local template collection is selected explicitly through the `local` source in `/sig/regime/regime.config.json`. It is not an implicit runtime root.

## Commands

```text
regime check [path] [--full]
regime sync [path]
```

| Command | Purpose |
|---------|---------|
| `check [path] [--full]` | Report missing files and drift. `--full` includes files and fields already in sync. |
| `sync [path]` | Create or update template-managed files. |

Both commands default to the current working directory. Config discovery recursively walks the target directory and skips `node_modules` and `.git`.

## Configuration

A project opts in with `regime.config.json`:

```json
{
  "sources": {
    "shared": "./config/templates"
  },
  "templates": [
    "shared:profile/library",
    "./templates/project"
  ],
  "vars": {
    "repo": "example"
  }
}
```

- `sources` maps aliases to config-relative or absolute filesystem roots.
- `templates` accepts source-qualified, config-relative, or absolute directory paths.
- `vars` supplies `<<name>>` interpolation values.
- `!` excludes an exact canonical template reference from the chain.

Colon syntax is reserved for source qualification. Unknown aliases warn and do not fall back to another root. Source values are literal filesystem paths; no package, registry, or URL resolution occurs.

### Ancestor Context

Loading a target config walks ancestors from the filesystem root to the target. Only `vars` and `sources` are inherited, and nearest declarations win. Relative source paths remain anchored to their declaring config directory. Templates stay local to the target config.

## Template System

Each template directory contains optional `.regime-template.json` metadata and files to apply:

```json
{
  "inherits": ["shared/package"],
  "patterns": {
    "package.json": "merge json",
    "tsconfig.json": "merge json",
    "tsconfig.*.json": "merge json"
  },
  "ignore": ["skills-lock.json"]
}
```

- `inherits` lists parents resolved depth-first before the child.
- `patterns` maps target paths or globs to file strategies.
- `ignore` skips matching files only in the declaring template.

Metadata inheritance remains in the initiating template root. Metadata paths do not parse source aliases or switch sources. Traversal identity includes root plus template path, so equal paths in different roots remain distinct.

### File Strategies

| Strategy | Behavior |
|----------|----------|
| `overwrite` (default) | Replace the target with the final template version. |
| `scaffold` | Create the target from the final template version only when absent; leave existing content untouched. |
| `merge json` | Deep-merge JSON; template values win, target-only keys remain, and arrays are unioned. |
| `merge jsonc` | Apply JSON merge semantics while parsing and writing JSONC. |
| `merge lines` | Append missing exact lines while preserving existing content and order. |

When multiple templates provide one target path, processing follows chain order. `overwrite` and `scaffold` use the last contributor; merge strategies combine all contributors.

### Variable Interpolation

Template contents and filenames can contain `<<name>>` placeholders. Effective `vars` replace them during `check` and `sync`. Undeclared variables warn and remain unchanged.

### Deep Merge Semantics

- Objects merge recursively; template keys override matching target keys.
- Arrays contain template items first, followed by unique target items.
- Primitives use the template value.

### Indentation

Existing JSON and JSONC indentation is preserved. New JSON files use two spaces; new JSONC files use tabs.

## Repository Assets

### Forgejo Actions

`actions/checks` installs Bun, resolves external workspaces, installs dependencies, then runs available quality scripts.

`actions/mirror` creates a filtered mirror and pushes it to the configured destination.

`actions/publish-npm` installs dependencies, configures registry authentication, and runs semantic release tooling.

### Scripts

`scripts/resolve-workspaces.ts` rewrites unavailable external workspace references before dependency installation in CI.

## Key Implementation Details

- `src/shared.ts` owns config loading, template resolution, interpolation, and merge helpers.
- `src/check.ts` reports drift without returning a failure status for drift alone.
- `src/sync.ts` applies template files and merge strategies.
- Template-chain traversal is parent-first and cycle-safe.
- Missing templates and unknown variables or sources emit diagnostics.
