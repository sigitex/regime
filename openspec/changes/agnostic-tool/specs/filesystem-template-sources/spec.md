## ADDED Requirements

### Requirement: Configured template sources
Regime SHALL accept a `sources` object whose keys are source aliases and whose values are filesystem paths to template roots. A template entry in `alias:template-path` form SHALL resolve `template-path` within the root mapped by `alias`.

#### Scenario: Relative source root
- **WHEN** a config declares source `company` as `node_modules/@company/templates` and template `company:profile/library`
- **THEN** Regime resolves the template from `node_modules/@company/templates/profile/library` relative to that source declaration's config directory

#### Scenario: Absolute source root
- **WHEN** a config maps an alias to an absolute filesystem path and uses that alias in a template entry
- **THEN** Regime resolves the template below that absolute root

#### Scenario: Unknown source alias
- **WHEN** a template entry uses `unknown:profile/library` and no effective source named `unknown` exists
- **THEN** Regime reports the unknown source and does not resolve the entry through any fallback root

### Requirement: Config-relative bare templates
Regime SHALL treat a template entry without a source qualifier as a filesystem path relative to the directory containing the config that declares the entry, unless the entry is already absolute.

#### Scenario: Relative bare template
- **WHEN** `/repo/project/regime.config.json` lists `./config-templates/library`
- **THEN** Regime resolves the template at `/repo/project/config-templates/library`

#### Scenario: Absolute bare template
- **WHEN** a config lists an absolute template directory path
- **THEN** Regime uses that absolute directory without rebasing it to the config directory

### Requirement: No bundled template root
Regime SHALL NOT consult a `templates/` directory bundled with the Regime installation when resolving template entries.

#### Scenario: Missing config-relative template matches bundled name
- **WHEN** a bare template entry is absent relative to its config but a template with the same path exists in Regime's repository-local `templates/` directory
- **THEN** Regime reports the config-relative template as missing and does not use the bundled template

### Requirement: Source-local template inheritance
Regime SHALL resolve every `.regime-template.json` `inherits` entry within the same template root selected by its top-level template entry. Template metadata SHALL NOT interpret source aliases or select another configured source.

#### Scenario: Sourced template inherits parent
- **WHEN** `company:profile/library` inherits `shared/package`
- **THEN** Regime resolves the parent below the `company` source root and applies it before the child

#### Scenario: Equal paths in separate sources
- **WHEN** templates from two source roots each inherit `shared/package`
- **THEN** Regime traverses each source's own `shared/package` template rather than deduplicating them by relative path alone

### Requirement: Filesystem-only source semantics
Regime SHALL treat source values only as absolute or config-relative filesystem paths and SHALL NOT perform package, registry, or URL resolution.

#### Scenario: Package-looking relative path
- **WHEN** a source value contains a package-looking path such as `node_modules/@company/templates`
- **THEN** Regime resolves that literal filesystem path without invoking package resolution

#### Scenario: URL-looking source value
- **WHEN** a source value looks like a URL
- **THEN** Regime does not fetch or otherwise resolve the URL as a remote resource
