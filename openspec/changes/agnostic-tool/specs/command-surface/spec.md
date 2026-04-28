## ADDED Requirements

### Requirement: Supported commands
Regime SHALL expose `check [path] [--full]` and `sync [path]` as its command-line workflows. When path is omitted, each command SHALL use the current working directory.

#### Scenario: Check with full output
- **WHEN** a user invokes `regime check <path> --full`
- **THEN** Regime checks configs below the path and includes entries already in sync

#### Scenario: Sync default path
- **WHEN** a user invokes `regime sync` without a path
- **THEN** Regime syncs configs below the current working directory

### Requirement: Removed template-management commands
Regime SHALL reject `promote` and `templates` as unsupported commands and SHALL NOT advertise them in CLI usage.

#### Scenario: Promote command requested
- **WHEN** a user invokes `regime promote`
- **THEN** Regime exits unsuccessfully and prints usage containing only supported commands and options

#### Scenario: Templates command requested
- **WHEN** a user invokes `regime templates`
- **THEN** Regime exits unsuccessfully and prints usage containing only supported commands and options

### Requirement: Removed yes option
Regime SHALL NOT accept or advertise the `--yes` option.

#### Scenario: Yes option requested
- **WHEN** a user invokes a Regime command with `--yes`
- **THEN** Regime rejects the unsupported option instead of treating it as a path or silently ignoring it
