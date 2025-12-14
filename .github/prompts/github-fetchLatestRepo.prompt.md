---
name: github-fetchLatestRepo
description: Fast-forward local branch to latest remote state after external changes
argument-hint: Optional arguments: <branch> <remote> (defaults: main origin)
---
You are a coding agent in a local workspace. The user wants to synchronize the local repository with the latest state from the remote after an external/cloud agent has pushed updates.

Follow these steps precisely:

1. Identify target remote and branch:
   - Use provided arguments if given (first = branch, second = remote).
   - Otherwise default to branch `main` and remote `origin`.
2. Verify git is initialized (`git rev-parse --is-inside-work-tree`). Abort with a concise message if not.
3. Check for uncommitted changes:
   - Run `git status --short`.
   - If there are local modifications or staged changes, prompt the user with options: commit, stash, or abort. Do NOT auto-discard.
4. Fetch latest refs: `git fetch <remote>`.
5. Compare local `<branch>` vs `<remote>/<branch>`:
   - Get local HEAD: `git rev-parse <branch>`.
   - Get remote HEAD: `git rev-parse <remote>/<branch>`.
6. If local branch is behind and has no divergence and no local changes:
   - Run `git pull --ff-only <remote> <branch>`.
7. If divergence detected (local contains commits not on remote):
   - Present options: (a) create backup branch and hard reset; (b) merge; (c) rebase.
   - Wait for user choice; do NOT proceed automatically.
8. After updating, verify synchronization:
   - Re-run `git rev-parse <branch>` and ensure it matches `<remote>/<branch>`.
   - List last 3 commits with `git log --oneline -3` for confirmation.
9. Report concise summary: previous local commit, new commit, number of pulled commits.
10. If a package manifest (`package.json`, `requirements.txt`, etc.) changed, ask user whether to run install/update commands.
11. Provide optional follow-up actions: run tests (`npm test`, `pytest`), open diff of pulled changes.

Constraints:
- Use PowerShell-compatible commands for Windows (separate commands per line; no `&&`).
- Do not amend or rewrite history without explicit user confirmation.
- Keep output concise; focus on actionable next steps.

If any step fails (e.g., network error), surface the failing command and a minimal remediation suggestion.

When ready, execute the plan. If arguments were supplied, state them at the top ("Target: <remote>/<branch>").
