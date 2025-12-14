---
name: github-commit
description: Commits all local changes with a clean, traceable message and pushes to remote. Creates PR if on feature branch.
argument-hint: Commit changes for current branch/issue.
---


# Prompt: Final Commit & Push (github-commit)

## Pre-Check: Changelog Prompt Executed?

Before proceeding, confirm:

**Have you already run the changelog prompt (`github-changelog.prompt.md`)?**

- [ ] Yes, changelog is up to date → continue with commit & push steps below.
- [ ] No, changelog not updated → **Please run the changelog prompt first:**

```
/github-changelog
```

---

Goal: Produce clean, traceable commits – either as the final step of an issue workflow or ad‑hoc for synchronization. Use this prompt when local changes exist and no final commit/push has been made yet.

## Process
1. **Changelog first!**
   - Always run the prompt in `github-changelog.prompt.md` first to update or create the `CHANGELOG.md` according to the latest changes and increment the version.
2. Inspect:
   - `git status` → Shows modified / new / deleted files.
   - `git diff --name-only` (optional) → Quick file list overview.
3. Grouping:
   - Changes only for ONE issue? → Single commit with issue reference.
   - Multiple unrelated changes? → Split into thematic commits before pushing.
4. Determine issue number (if branch convention used):
   - Branch pattern: `issue/<nr>-...` → extract `<nr>`.
   - No issue context? → Use generic prefix `chore:` or `docs:`.
5. Craft the commit message (English or German; be concise & active voice):
   - Issue format: `Issue #<nr>: <short precise change>`.
   - No trailing period; keep subject ≤ ~72 chars.
   - Optional body for complex changes:
     - What & Why (avoid restating diff).
     - Notes on potential follow-ups.
6. Edge case checks:
   - Do NOT commit temp files / logs (delete or add to `.gitignore`).
   - Avoid large binaries.
   - Unfinished refactors? Finish first or separate clearly.
7. Execute:
   - `git add -A`
   - `git commit -m "Issue #<nr>: <Description>"`
   - `git push` (feature branch: push branch; `main`: confirm direct push is intended).
8. **Tagging:**
   - After a successful push, create a git tag with the new version number from the top entry in `CHANGELOG.md` (e.g. `0.0.3`).
   - `git tag <version>`
   - `git push --tags`
9. After push:
   - Feature branch: open PR if not created: `gh pr create --fill --base main --head <branch>`.
   - Optional issue comment: `Status: In Review` then `Status: Done` post merge.

## Good Examples
- `Issue #14: Added due date field to task form`
- `Issue #6: Linked filter toolbar via aria-controls`
- `docs: Extend README with theming section`
- `chore: Add color-mix() fallback for light theme`

## Bad Examples
- `update` (too vague)
- `fixed stuff` (unclear)
- `Issue #14: Add due date for a task to support scheduling and planning user tasks and this also updates some unrelated styles` (too long / mixed concerns)

## When NOT to Commit Now
- Incomplete migrations / unstable intermediate states.
- Deliberate debug output left in code.
- Pending review where you plan additional grouped changes.

## Optional: Multi-Commit Strategy
If multiple areas changed:
1. Refactor commit (pure restructuring, no feature changes).
2. Feature commit (new functionality).
3. Docs/Status commit (issues file, README, etc.).

## Pre-Final Checklist
- [ ] Changelog updated (github-changelog.prompt.md run)
- [ ] All necessary files staged
- [ ] Commit message clear & scoped
- [ ] Issue number correct (if applicable)
- [ ] No forgotten temp files
- [ ] Push successful
- [ ] Tag with new version created and pushed
- [ ] Issue / PR status updated

Reuse this prompt whenever additional post-review changes are needed.
