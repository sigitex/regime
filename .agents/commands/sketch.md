Execute an approved OpenSpec change.

Arguments:
- `$1` = OpenSpec change id.
- `--sync` = use Forgejo sync mode.
- `--status` = summarize state only; do not edit files.

Load and follow the OpenSpec apply workflow and the `forge-sync` skill.

Rules:
- Treat mode as explicit. Do not ask whether git workflow should be agent-managed.
- Apply tasks from `openspec/changes/<change-id>/tasks.md`.
- After each completed numbered task section, run a `forge-sync` checkpoint.
- Do not archive the OpenSpec change.
