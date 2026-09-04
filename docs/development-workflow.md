# Development Workflow

This guide defines the repository's Git workflow, coding standards, and pull-request expectations. For framework design, see [architecture-guide.md](architecture-guide.md). For run-profile setup and test conversion, see [run-profile-adoption-guide.md](run-profile-adoption-guide.md).

---

## Git Workflow

Development follows a feature branch workflow.

### 1. Update Main

```powershell
git switch main
git pull origin main
```

---

### 2. Create a Feature Branch

Example:

```powershell
git switch -c <developer>/<feature-name>
```

Each feature should have its own branch.

Feature branches should be created from the latest version of the `main` branch after synchronizing with the remote repository.

Example:

```text
bryan/run-profile-auth-poc
```

---

### 3. Develop and Test

Make the scoped change locally, then run the affected test or validation command. Check `git status` throughout the work so generated artifacts and unrelated local changes do not enter the commit.

---

### 4. Commit Changes

```powershell
git status
git add <intended-files>
git diff --cached --check
git commit -m "Describe the completed change"
```

Commits should represent one logical feature.

---

### 5. Push Branch

```powershell
git push -u origin <branch-name>
```

---

### 6. Create a Pull Request

Create a Pull Request from:

```text
feature branch
        ↓
main
```

The Pull Request allows other developers to:

* review the code
* discuss implementation
* request changes
* approve the feature

Only approved Pull Requests should be merged into **main**.

---

### Pull Request Review Flow

After a PR is opened:

1. The automated PR review agent configured by Brian Mak reviews the submitted changes.
2. If the agent finds no issues, it approves the PR and merges it into `main`.
3. If the agent finds an issue, it leaves feedback and waits for the developer to respond.
4. The developer reviews the feedback, fixes the issue, commits the correction, and pushes it to the same feature branch.
5. The agent reviews the updated PR. It merges the PR when the issues are resolved or provides additional feedback when more work is required.
6. Steps 4 and 5 continue until the PR satisfies the automated review.

---

## Coding Standards

The framework follows these principles:

* Keep tests readable.
* Avoid duplicated code.
* Separate UI interactions from business processes.
* Store credentials outside of source control.
* Prefer reusable Page Objects.
* Prefer reusable Workflows.
* Validate one feature at a time.
* Prefer waiting for application readiness over fixed delays.
* Build small, test often, and commit frequently.
* Keep Page Objects focused on a single Oracle page or reusable Oracle component.

---

## Pull Request Checklist

Before opening a PR:

- [ ] All affected Playwright tests pass.
- [ ] Renamed methods have all references updated.
- [ ] Imports compile without errors.
- [ ] Documentation updated if architecture changed.
- [ ] New files are in the correct framework layer.
- [ ] No client credentials or client names are committed.
- [ ] Branch is up to date with main.
- [ ] If the review agent flags an issue, fix the issue and push the correction for the next automated review cycle.

---
