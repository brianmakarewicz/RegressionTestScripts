# Run-Profile Adoption Guide

This guide explains how to update an existing Playwright test to use the run-profile authentication framework and how to create the private profile it requires. For the design and runtime behavior of the framework, see [architecture-guide.md](architecture-guide.md).

---

## Updating an Existing Test to Use a Run Profile

Convert one test at a time. Do not remove the legacy configuration files while other tests still depend on them.

Before editing, identify the test's current configuration imports, required business user, functional-data file, and any additional browser sessions. This prevents the conversion from changing the test's business behavior while its configuration source is being replaced.

### 1. Decide which business user the test requires

Choose a role name based on what the user does:

- Use `standardUser` for the normal user who creates, searches, imports, posts, or otherwise performs the main test flow.
- Use `glApprover` when the test signs in as a journal approver.
- Add another descriptive role only when neither existing name represents the required permissions.

The test must name the role in its code. The framework cannot infer the correct user from the test filename or from the credentials.

### 2. Import and load the run profile once

Add the import using the correct relative path from the test file:

```typescript
import { requireRunProfile } from "../../../config/run-profile";
```

Then load the profile near the beginning of the test:

```typescript
const runProfile = requireRunProfile();
```

### 3. Replace legacy functional-data path construction

A legacy test may construct a path from `TEST_DATA_ALIAS` and `ENVIRONMENT`:

```typescript
const testDataAlias = requireTestDataAlias();
const dataFilePath = path.resolve(
  process.cwd(),
  "test-data",
  "clients",
  testDataAlias,
  env.environment,
  "gl",
  "create-journal.json",
);
```

Replace that selection logic with the absolute `testDataPath` already supplied by the run profile:

```typescript
const dataFilePath = path.join(
  runProfile.testDataPath,
  "gl",
  "create-journal.json",
);
```

Keep the existing data loader. Its responsibility does not change:

```typescript
const journalData = loadCreateJournalData(dataFilePath);
```

If a test does not read a functional-data file, it does not need to use `runProfile.testDataPath`.

### 4. Pass the required named user to authentication

Legacy authentication relies on fallback environment values:

```typescript
const authentication = new AuthenticationWorkflow(page);
```

Replace it with an explicit named user:

```typescript
const authentication = new AuthenticationWorkflow(
  page,
  runProfile.user("standardUser"),
);
```

This is the change that connects the test to the selected user's `baseUrl`, `username`, and `password` from the run-profile JSON.

### 5. Handle additional users only when the workflow requires them

For a second user, request another role and use a new browser context:

```typescript
const approverContext = await browser.newContext();

try {
  const approverPage = await approverContext.newPage();
  const approverAuthentication = new AuthenticationWorkflow(
    approverPage,
    runProfile.user("glApprover"),
  );
  await approverAuthentication.login();
} finally {
  await approverContext.close();
}
```

Do not log the first user out and reuse the same page. Do not open the second user in another page within the first user's context. A separate context is what isolates their cookies and session storage.

### 6. Confirm the private profile contains every requested role

If the test calls only `runProfile.user("standardUser")`, the selected profile needs only `standardUser`. If it also calls `runProfile.user("glApprover")`, both entries must exist:

```json
{
  "users": {
    "standardUser": {
      "username": "<standard username>",
      "password": "<standard password>"
    },
    "glApprover": {
      "username": "<approver username>",
      "password": "<approver password>"
    }
  }
}
```

When a reusable role is introduced, update the sanitized run-profile example so other developers know that the role may be required. Never place real credentials in the example.

### 7. Run the converted test with one selector

Remove the legacy selectors from the command and select the intended profile:

```powershell
$env:RUN_PROFILE="demo-dev"
npx playwright test <test-path> --project=chromium --headed
```

### Conversion Checklist

- [ ] The test imports and calls `requireRunProfile()` once.
- [ ] Client functional-data paths start from `runProfile.testDataPath` when applicable.
- [ ] Every `AuthenticationWorkflow` receives an explicit `runProfile.user("<role>")` value.
- [ ] Every requested role exists in the selected private run-profile JSON.
- [ ] Different simultaneous users run in different browser contexts.
- [ ] The command requires only `RUN_PROFILE` for environment, data-path, and user selection.
- [ ] Imports and variables used only by the legacy selection logic are removed from that test.
- [ ] Shared legacy configuration remains intact for other tests that still use it.

## Creating a New Run Profile

To add a new client environment for a run-profile test:

1. Copy `environments/run-profiles/demo-dev.example.json` to a private file named for the client alias and environment.

Example:

```text
environments/run-profiles/<client-alias>-<environment>.json
```

2. Set its functional-data path, Fusion URL, and standard user:

```json
{
  "testDataPath": "test-data/clients/<client-alias>/<environment>",
  "baseUrl": "<client URL>",
  "users": {
    "standardUser": {
      "username": "<username>",
      "password": "<password>"
    }
  }
}
```

3. Add any additional users required by the selected workflows. The value of `users` for a journal creator and approver looks like this:

```json
{
  "standardUser": {
    "username": "<creator username>",
    "password": "<creator password>"
  },
  "glApprover": {
    "username": "<approver username>",
    "password": "<approver password>"
  }
}
```

Place additional entries inside the same `users` object. Do not create another functional-data folder merely to select another user.

4. Create the client test-data directory and the module JSON files required by the tests:

```text
test-data/clients/<client-alias>/<environment>/<module>/
```

5. Select the profile when running a run-profile test:

```powershell
$env:RUN_PROFILE="<client-alias>-<environment>"
npx playwright test <test-path>
```

The test selects `standardUser`, `glApprover`, or another named role in its TypeScript code. The command stays the same regardless of how many users the workflow uses. If the selected test still uses the older configuration system, follow [Legacy Configuration Reference](#legacy-configuration-reference) instead of creating a run profile for it.

---

## Legacy Configuration Reference

A legacy test can still use:

```powershell
$env:TEST_DATA_ALIAS="demo"
$env:CLIENT_ALIAS="demo"
$env:ENVIRONMENT="dev"
npx playwright test <legacy-test-path>
```

That legacy selection loads:

```text
environments/.env.demo.dev
```

---
