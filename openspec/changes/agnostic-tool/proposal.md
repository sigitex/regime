## Why

Regime currently couples template resolution and CLI behavior to Sigitex conventions stored inside this repository. Separating templates from the tool lets any project or company provide filesystem-based template collections while nested projects reuse shared configuration.

## What Changes

- **BREAKING** Add a `sources` map to regime configs and address sourced templates as `source:template-path`.
- **BREAKING** Resolve bare template paths relative to the config file instead of Regime's bundled `templates/` directory; bundled templates are no longer used.
- Keep template inheritance within the root selected by the template entry; `.regime-template.json` does not gain cross-source addressing.
- Inherit only `vars` and `sources` from ancestor regime configs, with nearer declarations overriding farther declarations.
- Preserve each inherited source path relative to the config that declared it.
- **BREAKING** Remove the `promote` and `templates` subcommands and the promote-only `--yes` option.
- Update README configuration, command, and template documentation for the new conventions.

## Capabilities

### New Capabilities
- `filesystem-template-sources`: Resolve qualified and bare template references from configurable filesystem roots without relying on bundled templates.
- `inherited-config-context`: Compose `vars` and `sources` from ancestor configs while preserving declaration-relative source paths.
- `command-surface`: Expose only the supported `check` and `sync` CLI workflows.

### Modified Capabilities

None.

## Impact

- Affects config types and loading, template-chain resolution, and both `check` and `sync` execution.
- Removes CLI routing and implementation modules for `promote` and `templates`; `gum` is no longer required by Regime.
- Existing configs using bundled bare template names require manual migration to explicit source mappings or config-relative paths.
- Existing external scripts invoking removed commands or `--yes` must be updated.
- README examples and reference documentation must describe source-qualified templates, inherited context, and the reduced command set.
