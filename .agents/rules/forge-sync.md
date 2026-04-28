---
description: Local vs sync mode rules for git and Forgejo — commit, push, and PR policy per workflow.
---

# Forge Sync Rules

When a workflow uses explicit mode:

- `Mode: sync` or `--sync` means sync mode.
- no sync marker means local mode.
- Do not ask whether git workflow should be agent-managed.

Local mode:
- No push.
- No forge write tools.
- No PR create/update/comment.

Sync mode:
- Commit completed workflow units.
- Push after each unit commit.
- Create PR after first push if missing.
- Reuse existing PR on later pushes.
- Comment/update PR only when workflow asks for it.

Forbidden always:
- No force push.
- No branch deletion.
- No hard reset.
- No amending unless explicitly requested.
