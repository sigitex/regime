# Regime

Filesystem-based configuration management for repositories and packages.

Regime discovers project configs, resolves their template directories, and checks or syncs template-managed files. Template collections live anywhere on the local filesystem; Regime does not provide an implicit template root.

## CLI

```text
regime check [path] [--full]
regime sync [path]
```

If `path` is omitted, Regime uses the current working directory. Both commands discover configs recursively below that path, skipping `node_modules` and `.git`.

### `regime check [path] [--full]`

Compares managed files with their templates and reports missing files or drift. By default, only problems appear. `--full` also prints files and fields already in sync.

### `regime sync [path]`

Creates or updates managed files. Existing files use their configured merge strategy; files already in sync remain untouched.

## Configuration

Add `regime.config.json` to each project that owns a template list:

```json
{
  "sources": {
    "shared": "./node_modules/@example/regime-templates"
  },
  "templates": [
    "shared:profile/library",
    "./templates/project"
  ],
  "vars": {
    "repo": "my-project"
  }
}
```

- `sources` maps aliases to filesystem template roots.
- `templates` is a string or array of template references.
- `vars` provides values for `<<name>>` placeholders in template contents and filenames.

### Template References

Template entries support three forms:

- `alias:path` resolves `path` below the effective `sources.alias` root.
- `./path` or `path` resolves relative to the directory containing the config.
- An absolute path uses that exact filesystem location.

Colon syntax is reserved for source-qualified references. Unknown aliases produce a warning and do not fall back to another root.

Prefix a reference with `!` to exclude that exact canonical template from a chain:

```json
{
  "templates": [
    "shared:profile/library",
    "!shared:include/license"
  ]
}
```

No template path resolves relative to Regime's installation. A missing config-relative path remains missing even if Regime's own repository contains a directory with the same name.

### Ancestor Context

For each discovered target config, Regime reads configs in every ancestor directory from the filesystem root to the target. Only `vars` and `sources` are inherited. Nearest declarations replace farther declarations with the same key.

Relative source paths stay anchored to the config that declared them. Templates are never inherited; each target uses only its own `templates` field.

For example, a repository config can provide shared context:

```json
{
  "sources": {
    "shared": "./config/templates"
  },
  "vars": {
    "organization": "example"
  }
}
```

A nested project can then select its own templates:

```json
{
  "templates": ["shared:profile/service"],
  "vars": {
    "service": "billing"
  }
}
```

The nested project resolves `shared` against the repository config directory, inherits `organization`, and keeps its template list local.

### Filesystem-Only Sources

Source values are absolute or config-relative filesystem paths. Regime does not resolve package names, registries, or URLs and never fetches remote resources.

A path such as `node_modules/@example/regime-templates` works because it names a literal directory. A URL-looking value is also treated only as a literal filesystem path.

## Template Directories

Each template is a directory containing optional `.regime-template.json` metadata plus files to apply:

```text
template-root/
  shared/package/
    .regime-template.json
    package.json
  profile/library/
    .regime-template.json
    tsconfig.json
```

Metadata can define inheritance, file strategies, and template-local ignores:

```json
{
  "inherits": ["shared/package"],
  "patterns": {
    "package.json": "merge json",
    "tsconfig.*.json": "merge json"
  },
  "ignore": ["generated/**"]
}
```

- `inherits` lists parent paths applied depth-first before the child.
- `patterns` maps target paths or globs to file strategies.
- `ignore` skips matching files only within the template declaring it.

Inheritance stays within the root selected by the top-level template entry. Metadata paths do not parse source aliases and cannot switch to another configured source. Equal paths in separate source roots remain separate templates.

### File Strategies

| Strategy | Behavior |
|----------|----------|
| `overwrite` (default) | Replace the target file with the final template version. |
| `merge json` | Deep-merge JSON. Template values win; target-only keys remain; arrays are unioned. |
| `merge jsonc` | Apply the JSON merge semantics while parsing and writing JSONC. |
| `merge lines` | Append missing exact template lines while preserving existing content and order. |

When multiple templates provide the same target path, Regime processes them in chain order. The final contributor wins for `overwrite`; merge strategies combine all contributors before updating the target.

### Variable Interpolation

Template contents and filenames can contain `<<name>>` placeholders. `check` and `sync` replace them with effective `vars` values. Undeclared variables emit a warning and remain unchanged.

For example, `<<repo>>.code-workspace` with `vars: { "repo": "route" }` produces `route.code-workspace`.

### Indentation

Updates preserve existing JSON or JSONC indentation. New JSON files use two spaces; new JSONC files use tabs.

## Migration

Configs that relied on template names bundled with Regime require manual migration:

1. Make each template collection available on the local filesystem.
2. Add a `sources` alias for each collection, or use config-relative or absolute template paths.
3. Qualify template entries with their source alias where applicable.
4. Move common `vars` and `sources` to ancestor configs if nested projects should share them.
5. Update automation to use only the documented `check` and `sync` forms.

Regime has no compatibility fallback to an installation-local template directory.
