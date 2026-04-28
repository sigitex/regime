## ADDED Requirements

### Requirement: Ancestor config context
Regime SHALL load `vars` and `sources` from regime configs in every ancestor directory through the filesystem root when evaluating a target config.

#### Scenario: Nested config reuses root context
- **WHEN** a repository config declares `vars` and `sources` and a nested project config declares only `templates`
- **THEN** Regime evaluates the nested project's templates with the repository config's variables and sources

#### Scenario: Multiple ancestor levels contribute context
- **WHEN** different ancestor configs declare distinct variable and source keys
- **THEN** the target config receives all non-conflicting keys from those ancestors

### Requirement: Nearest declaration precedence
Regime SHALL merge inherited `vars` and `sources` from farthest ancestor to target so the nearest declaration of each key wins.

#### Scenario: Nested variable override
- **WHEN** root, intermediate, and target configs declare different values for the same variable
- **THEN** Regime uses the target config's value

#### Scenario: Nearest ancestor source override
- **WHEN** two ancestor configs declare the same source alias and the target does not override it
- **THEN** Regime uses the declaration from the nearer ancestor

### Requirement: Declaration-relative inherited source paths
Regime SHALL keep each relative source path anchored to the directory containing the config that declared the effective source value.

#### Scenario: Parent-relative source used by child
- **WHEN** `/repo/regime.config.json` declares source `company` as `./templates` and `/repo/packages/app/regime.config.json` uses `company:profile/app`
- **THEN** Regime resolves the source root as `/repo/templates`, not `/repo/packages/app/templates`

#### Scenario: Child overrides inherited relative source
- **WHEN** a child config overrides an inherited source alias with `./templates`
- **THEN** Regime resolves the effective source relative to the child config directory

### Requirement: Explicit inheritance field allowlist
Regime SHALL inherit only `vars` and `sources`; `templates` and all other config fields SHALL remain local to the target config.

#### Scenario: Parent templates are not inherited
- **WHEN** a parent config and nested target config each list templates
- **THEN** Regime evaluates the nested target using only its own template entries while still inheriting parent variables and sources
