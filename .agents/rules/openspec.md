---
description: Rules for OpenSpec propose and archive workflows.
---

# OpenSpec Instructions

## OpenSpec Propose Workflow

When proposing changes via `/opsx-propose`:

- If the change introduces or modifies user-facing behavior (API changes, conventions), include a task section for updating `README.md` in the proposal's impact assessment.

## OpenSpec Archive Workflow

When archiving tasks via `/opsx-archive`:

1. Automatically sync specs, do not ask the user.
2. If mode is explicit, use `forge-sync` for archive commit, push, PR, and Forgejo behavior.
3. If no mode is explicit, default to local mode.
