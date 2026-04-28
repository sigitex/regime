---
name: forge-sync
description: Use for `sketch --sync`, `sketch-sync`, or workflows needing shared local-vs-forge git handling; centralizes branch, commit, push, PR, and forge comment policy.
---

# Forge Sync

Forge Sync = shared git + forge workflow policy. It decides how completed workflow units become commits, pushes, PRs, and PR comments. It does not decide when code work is complete.

## Inputs

Caller must provide or make clear:

- Mode: `local` or `sync`.
- Change ID.
- Workflow: `sketch`, `archive`, or other.
- Unit: task section, archive, or named completed work unit.
- Commit message.
- Optional PR comment body.

If mode is explicit, do not ask git workflow questions.

## Universal Rules

- Never force-push.
- Never delete branches.
- Never run destructive git commands.
- Never amend unless explicitly requested.
- Before committing, inspect status and diff.
- Do not include unrelated user changes.
- Commit messages must follow Conventional Commit and commitlint rules.

## Local Mode

Local mode means:

- Do not push.
- Do not create, update, or comment on PRs.
- Do not call forge write tools.
- Create local commits only when caller requests a completed unit commit.
- If unrelated changes exist, commit only files/hunks belonging to current unit.

## Sync Mode

Sync mode means:

- Ensure work happens on a feature branch for the change when caller has not already selected one.
- Commit completed unit.
- Push current branch after each unit commit.
- Create PR after first push if no PR exists.
- Reuse existing PR on later pushes.
- Add or update PR comment when caller provides comment body.

Default branch name when creating one:

```txt
feat/<change-id>
```

Default PR base:

```txt
main
```

Do not create duplicate PRs. Check branch/PR state first when feasible.

## Checkpoint Procedure

When caller says a unit is complete:

1. Inspect git status and diff.
2. Stage only relevant files.
3. Commit with caller-provided message.
4. If mode is local, stop.
5. If mode is sync, push current branch.
6. If PR comment body provided, comment or update as directed by caller.
7. Report commit SHA, push status, PR URL/number, and comment status.

## PR Comment Shape

Use caller-provided body when available. If caller asks for a default comment:

```md
## <Workflow> <Unit>

Change: `<change-id>`

Commits:
- `<sha>` <subject>

Verification:
- <summary>
```
