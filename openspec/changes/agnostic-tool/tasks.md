## 1. Config Context Loading

- [x] 1.1 Extend config types with `sources` and normalize each declared source path against its declaring config directory.
- [x] 1.2 Load ancestor configs from filesystem root to target, merging only `vars` and `sources` with nearest declarations winning while keeping target templates local.
- [x] 1.3 Verify multi-level inheritance, nearest overrides, declaration-relative source paths, and non-inherited templates with temporary uncommitted checks.

## 2. Filesystem Template Resolution

- [x] 2.1 Replace the global bundled-template root with canonical template references that resolve source-qualified, config-relative, and absolute entries, including exclusions and unknown-source diagnostics.
- [x] 2.2 Refactor template metadata and chain traversal to keep inheritance within each initiating root and deduplicate by root plus template path.
- [x] 2.3 Update `check` and `sync` to pass each config's effective sources and config directory into template resolution without any bundled fallback.
- [x] 2.4 Verify qualified, bare relative, absolute, missing, filesystem-only, source-local inheritance, and equal-path multi-source cases with temporary uncommitted checks.

## 3. CLI Reduction

- [x] 3.1 Remove `promote`, `templates`, and `--yes` from CLI routing and usage, and reject unsupported commands and options.
- [x] 3.2 Delete the removed command modules and stale helpers that only discover, mutate, or de-interpolate bundled templates.
- [x] 3.3 Verify supported commands, `check --full`, default paths, removed commands, and removed `--yes` handling with temporary uncommitted checks.

## 4. Documentation and Verification

- [x] 4.1 Rewrite README command and configuration guidance for source-qualified and config-relative templates, ancestor `vars`/`sources`, source-local inheritance, manual migration, and the absence of package or URL resolution.
- [x] 4.2 Remove company/convention-specific positioning and obsolete Gum, bundled-template, promotion, and template-listing documentation.
- [x] 4.3 Remove all temporary test files and scripts, confirm no tests or test configuration remain in the change, then run lint and resolve all failures.
