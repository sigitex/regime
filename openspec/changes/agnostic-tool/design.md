## Context

Regime currently treats every template name as a path below a single `templates/` directory located beside its source code. Config loading combines the public and internal files in one directory but does not inspect ancestor directories. `check`, `sync`, `promote`, and `templates` all depend on the global template root, with the latter two especially tied to owning and modifying that root.

The new config model must resolve templates from arbitrary filesystem locations, preserve source-path meaning across nested configs, and retain existing template metadata behavior without introducing package or network resolution. This is a deliberate breaking change; existing consumers will migrate manually.

## Goals / Non-Goals

**Goals:**

- Resolve source-qualified template references from a config's effective `sources` map.
- Resolve bare template references relative to the directory containing the config that lists them.
- Keep inherited templates in the same root as the template that declared them.
- Inherit `vars` and `sources` from every ancestor config through the filesystem root, with nearest values winning.
- Remove runtime dependence on Regime's repository-local `templates/` directory.
- Reduce the CLI to `check` and `sync` while preserving `check --full`.

**Non-Goals:**

- Resolving npm package specifiers, URLs, registries, or any source type other than filesystem paths.
- Allowing `.regime-template.json` inheritance to select or cross into another configured source.
- Automatically moving or publishing the current bundled templates.
- Automatically migrating existing configs or retaining a fallback to the bundled template directory.
- Reintroducing template listing or promotion against external sources in this change.

## Decisions

### Normalize source declarations before merging config context

For each config directory, load its locally recognized config files using the existing same-directory merge behavior. Resolve every locally declared source value to an absolute path against that directory before combining inherited context. Walk configs from the filesystem root toward the target config and shallow-merge only `vars` and normalized `sources`; later values replace matching earlier keys. Apply the target config last.

Normalizing at declaration time preserves the required base directory without carrying separate origin metadata through template resolution. Merging raw relative strings and resolving them at the child was rejected because it changes inherited paths. Inheriting whole configs was rejected because templates and future fields must remain local unless explicitly added to the inheritance contract.

### Represent every template entry as a root plus root-relative path

Resolve each top-level template entry into a canonical template reference:

- `alias:path` uses the absolute root stored under `alias` in the effective `sources` map and `path` within that root.
- A bare relative path uses the target config directory as root.
- A bare absolute path remains an absolute filesystem location.

Template exclusions are parsed before reference resolution and compared using canonical filesystem identities so identical relative names from different sources do not collide. An unknown source alias is invalid and must produce a diagnostic rather than falling back to Regime's bundled templates.

Passing arbitrary resolver callbacks or introducing source-provider objects was rejected as unnecessary: all supported values reduce to filesystem paths.

### Bind metadata inheritance to the initiating template root

Template-chain traversal carries the root selected by each top-level entry. Every `inherits` value in `.regime-template.json` resolves within that same root, and the traversal's visited identity includes both root and template path. Metadata does not parse source aliases, so an inherited template cannot switch sources. Existing parent-first ordering, file strategies, patterns, ignores, and interpolation remain unchanged.

Using the child config directory for all inherited templates was rejected because sourced template collections must be self-contained. Resolving inheritance through the global `sources` map was rejected because it would couple a source's metadata to consumer-specific aliases.

### Keep config discovery separate from ancestor context loading

Recursive discovery continues to identify target config entries below the requested path. Loading each entry separately walks its ancestor directories to collect inherited context. This preserves current command scope while allowing an invoked nested project to use repository-level variables and sources.

### Delete source-bound commands instead of adapting them

Remove CLI cases and implementation modules for `promote` and `templates`, remove `--yes` parsing, and update usage output to advertise only `check`, `sync`, and `check --full`. Keep the repository's existing `templates/` directory untouched but remove all runtime references to it; moving its contents is a separate manual operation.

Adapting either removed command to multiple external roots was rejected because ownership, write targeting, and aggregate listing semantics are not defined yet.

### Verify behavior without committed tests

Use temporary, uncommitted checks with disposable directory trees while implementing. Cover qualified, config-relative, and absolute template references; same-root metadata inheritance; duplicate relative names across roots; ancestor precedence; declaration-relative inherited sources; non-inheritance of templates; and removed CLI commands. Existing `check` and `sync` behavior remains the integration boundary for file strategies and interpolation. Remove temporary test files and scripts before completing the change; no test suite or test configuration will be committed.

## Risks / Trade-offs

- **Ambiguous colon-containing bare paths**: Treat colon syntax as source qualification and report unknown aliases; document this reserved syntax.
- **Ancestor filesystem reads on each config load**: Directory depth is small and config files are tiny; keep the direct walk unless measurement shows a need for caching.
- **Duplicate processing of repository root and nested configs**: Preserve current discovery behavior; inheritance changes context, not which configs execute.
- **Source paths can become unavailable after dependency installation changes**: Surface existing missing-template diagnostics with resolved filesystem locations.
- **Breaking consumers without fallback**: Document manual migration clearly and release as a breaking change.

## Migration Plan

1. Move or publish template collections separately from this implementation.
2. Make each collection available on consumer filesystems, including through `node_modules` when desired.
3. Add source aliases to a repository-level config and qualify template entries, or replace entries with config-relative/absolute paths.
4. Remove duplicated `vars` and `sources` from nested configs after verifying ancestor inheritance.
5. Update automation that invokes `promote`, `templates`, or `--yes`.
6. Release the new Regime version as a breaking change. Rollback requires restoring the prior Regime version and prior config paths together.

## Open Questions

None.
