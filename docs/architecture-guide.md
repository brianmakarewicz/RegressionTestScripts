# Playwright Architecture Guide

## Overview

This repository contains a Playwright automation framework designed to automate testing across multiple Oracle Fusion Cloud clients while keeping client-specific information and credentials out of source control.

The framework supports both:

* UI Testing
* API Testing

The framework is designed around reusability, maintainability, and security. The goal is to develop automation once and execute it against multiple clients and multiple environments with little or no code changes.

---

# Design Goals

The framework was designed with the following objectives:

1. Reuse the same automation across multiple Oracle Fusion clients.
2. Prevent client names from appearing in source control.
3. Prevent credentials from being committed to GitHub.
4. Allow each developer to maintain their own local environment configuration.
5. Separate framework configuration from Playwright configuration.
6. Separate page interactions from business workflows.
7. Build a framework that is easy for multiple developers to maintain.

---

# Run-Profile Naming Convention

## What a run profile is

A run profile is one private JSON configuration file with the `.json` file extension. It identifies everything needed to run a test against one client environment:

- The folder containing that environment's functional test data.
- The Oracle Fusion URL.
- One or more users that can sign in to that URL.

Run profiles live under this repository directory:

```text
RegressionTestScripts/
└── environments/
    └── run-profiles/
        ├── demo-dev.example.json  Tracked example without real credentials
        └── c001-dev.json          Private local profile ignored by Git
```

`RUN_PROFILE` is a PowerShell environment variable, not a JSON property and not a TypeScript file. Its value is the run-profile filename without the `.json` extension:

```text
RUN_PROFILE=c001-dev
            │
            └── loads environments/run-profiles/c001-dev.json
```

Real client names should never appear in:

* Folder names
* File names
* Branch names
* Test names
* Comments
* Configuration files committed to GitHub

Instead, descriptive but non-sensitive run-profile names are used. `RUN_PROFILE` is the only terminal selector required by a run-profile test.

| Run profile | Meaning |
| --- | --- |
| `c001-dev` | Client alias `c001`, development environment |
| `c001-test` | Client alias `c001`, test environment |
| `c002-dev` | Client alias `c002`, development environment |

The actual client mapping should be maintained outside of GitHub.

---

# Environment Configuration

The TypeScript entry point used by a run-profile test is:

```text
config/run-profile.ts
```

`config/run-profile.ts` exports the `requireRunProfile()` function. When a test calls that function, it reads the PowerShell environment variable named `RUN_PROFILE`, converts its value to lowercase, and verifies that the value is safe to use as a filename. It then adds the `.json` extension and loads the matching file from:

```text
environments/run-profiles/<run-profile>.json
```

For example, `RUN_PROFILE=c001-dev` loads `environments/run-profiles/c001-dev.json`.

The contents of that file look like this:

```json
{
  "testDataPath": "test-data/clients/c001/dev",
  "baseUrl": "https://example.oraclecloud.com",
  "users": {
    "standardUser": {
      "username": "example-creator",
      "password": "example-password"
    },
    "glApprover": {
      "username": "example-approver",
      "password": "example-approver-password"
    }
  }
}
```

## Complete run-profile flow example

| Step | Component | What happens |
| --- | --- | --- |
| 1 | PowerShell | Sets `RUN_PROFILE=com-dev`. |
| 2 | `config/run-profile.ts` | Reads `RUN_PROFILE` and loads `environments/run-profiles/com-dev.json`. |
| 3 | `create-journal-save-close.spec.ts` | Requests `standardUser` and the Create Journal data file. |
| 4 | `AuthenticationWorkflow` | Receives the selected user's URL, username, and password. |
| 5 | Create Journal data loader | Loads and validates `<testDataPath>/gl/create-journal.json`. |
| 6 | Page Objects | Sign in and perform the Create Journal actions in Oracle Fusion. |

## What happens when a test is started

Consider this command:

```powershell
$env:RUN_PROFILE="com-dev"
npx playwright test tests/erp/gl/create-journal-save-close.spec.ts `
  --project=chromium `
  --headed
```

The flow is:

1. PowerShell stores the text `com-dev` in the environment variable `RUN_PROFILE` for the current terminal session.
2. Playwright starts only `tests/erp/gl/create-journal-save-close.spec.ts` because that exact test file was supplied in the command.
3. The test imports `requireRunProfile` from `config/run-profile.ts` and calls it:

   ```typescript
   const runProfile = requireRunProfile();
   ```

4. `requireRunProfile()` reads `process.env.RUN_PROFILE`. Node exposes the PowerShell value there, so the function receives `com-dev`. Playwright itself does not choose or interpret the profile name.
5. `config/run-profile.ts` adds the `.json` extension and constructs this path from the repository working directory:

   ```text
   <repository>/environments/run-profiles/com-dev.json
   ```

6. The loader reads that file and validates its `testDataPath`, `baseUrl`, and `users` object. It returns a `runProfile` object to the test.
7. The Create Journal test builds its functional-data path by joining the profile's `testDataPath` with the file required by this script:

   ```typescript
   const dataFilePath = path.join(
     runProfile.testDataPath,
     "gl",
     "create-journal.json",
   );
   ```

   If `testDataPath` is `test-data/clients/com/dev`, the resulting file is:

   ```text
   <repository>/test-data/clients/com/dev/gl/create-journal.json
   ```

8. The run-profile loader does not decide which user a test needs. The test makes that decision by requesting a named role. This Create Journal script contains this call:

   ```typescript
   runProfile.user("standardUser")
   ```

   Therefore, this script requires the `standardUser` entry in `com-dev.json`. If that user is missing, the loader stops with an error that lists the available names.
9. The test passes the selected authentication values directly into the reusable workflow:

   ```typescript
   const authentication = new AuthenticationWorkflow(
     page,
     runProfile.user("standardUser"),
   );
   await authentication.login();
   ```

   `runProfile.user("standardUser")` returns the profile's shared `baseUrl` plus that user's `username` and `password`. `AuthenticationWorkflow` passes those values to `FusionLoginPage`, which opens the URL, enters the credentials, and waits for the Fusion home page.
In short, the command selects the profile file, while the TypeScript test selects `standardUser` and `create-journal.json`. The authentication workflow receives the chosen user's URL and credentials as constructor values; it does not search the JSON or guess which user should sign in.

Every property shown in the example lives inside the selected `.json` file under `environments/run-profiles/`:

- `testDataPath` is a repository-relative folder path. In the example, it resolves to `RegressionTestScripts/test-data/clients/c001/dev/`. A GL test appends its own path, such as `gl/create-journal.json`, to that folder.
- `baseUrl` is the Oracle Fusion address opened by the login Page Object. It is defined once because all users in one run profile sign in to the same Fusion environment. If another user signs in through a different URL, create a different run profile for that URL.
- `users` contains the login accounts available to tests using this profile. It is a JSON object whose property names describe business roles.
- `standardUser` and `glApprover` are named properties inside `users`. They are not Playwright keywords. Test code requests the required name by calling `runProfile.user("standardUser")` or `runProfile.user("glApprover")`.
- `username` and `password` live inside each named-user entry. The loader combines those values with the shared `baseUrl` when the test requests that user.

The `users` value is an object instead of an array so user selection never depends on order. Adding or rearranging users cannot silently change which account a test receives.

Real run-profile files are ignored by Git because they currently contain credentials. Only sanitized files ending in `.example.json` may be committed.

## Resolution and validation flow

`requireRunProfile()` performs the following work once per Playwright worker process:

1. Read and normalize `RUN_PROFILE`.
2. Reject a missing or unsafe profile name before reading a file.
3. Resolve the profile from the repository's `environments/run-profiles` directory.
4. Fail clearly if the file is missing or contains invalid JSON.
5. Validate non-empty `testDataPath`, `baseUrl`, and `users` values.
6. Resolve `testDataPath` to an absolute path from the repository working directory.
7. Cache the validated profile for later calls in that worker.

Tests request credentials by role:

```typescript
const runProfile = requireRunProfile();
const creator = runProfile.user("standardUser");
const approver = runProfile.user("glApprover");
```

`user(name)` combines the shared `baseUrl` with that user's username and password and returns an authentication profile. If the requested name is absent, the error lists the available user names. A test that only needs `standardUser` does not require `glApprover` to exist.

## Why named users are stored together

The earlier design required separate terminal variables to select a client, functional-data folder, environment, and sometimes an alternate authentication profile. That made a command responsible for coordinating values that already belonged to one execution target.

The run profile makes that relationship explicit. One selection chooses one Fusion environment, one functional-data root, and all users that tests may need there. Named user keys also make the intended role visible in test code and allow more roles to be added without changing the command-line interface.

For example, a future workflow can add another role without changing `RUN_PROFILE`:

```json
"users": {
  "standardUser": { "username": "...", "password": "..." },
  "glApprover": { "username": "...", "password": "..." },
  "readOnlyAuditor": { "username": "...", "password": "..." }
}
```

Tests should request only the roles they actually use. Role names should describe business responsibility rather than a person's name.

## Backward compatibility

`config/environment.ts` preserves the previous configuration path for legacy tests that do not call `requireRunProfile()` yet.

```text
Legacy terminal variables
        → config/environment.ts
        → legacy .env credential file
        → AuthenticationWorkflow(page)
```

This legacy path is separate from the run-profile path. It exists so older tests keep working while the team updates them individually.

- When `RUN_PROFILE` is set, it loads the run profile and exposes its name and `baseUrl`. It does not load a legacy `.env` credential file.
- When `RUN_PROFILE` is absent, it requires `CLIENT_ALIAS` and `ENVIRONMENT`, loads `environments/.env.<client-alias>.<environment>`, and exposes `ORACLE_BASE_URL`, `ORACLE_USERNAME`, and `ORACLE_PASSWORD` through `env`.
- `TEST_DATA_ALIAS` remains available to legacy tests through `requireTestDataProfile()` and the compatibility function `requireTestDataAlias()`.
- `config/authentication-profile.ts` remains available for legacy multi-user code that loads an additional `.env` file directly without changing `process.env`.

The reusable login components support both paths. Run-profile tests pass credentials explicitly:

```typescript
const authentication = new AuthenticationWorkflow(
  page,
  requireRunProfile().user("standardUser"),
);
```

Legacy tests may omit the second constructor argument:

```typescript
const authentication = new AuthenticationWorkflow(page);
```

In that case, `FusionLoginPage` falls back to the values exported by `config/environment.ts`. This fallback is why legacy scripts continue to work while tests are converted individually. New and updated tests should pass a named run-profile user explicitly.

Do not set `RUN_PROFILE` and expect legacy `CLIENT_ALIAS`, `ENVIRONMENT`, or `.env` credentials to override it. When `RUN_PROFILE` is present, it is the selected configuration path.

### How to identify the configuration used by a test

Open the test's `.spec.ts` file and inspect its imports and authentication setup.

A run-profile test imports `requireRunProfile()` and passes a named user to `AuthenticationWorkflow`:

```typescript
import { requireRunProfile } from "../../../config/run-profile";

const runProfile = requireRunProfile();
const authentication = new AuthenticationWorkflow(
  page,
  runProfile.user("standardUser"),
);
```

Its functional-data path also begins with `runProfile.testDataPath`:

```typescript
const dataFilePath = path.join(
  runProfile.testDataPath,
  "gl",
  "create-journal.json",
);
```

A legacy test imports values from `config/environment.ts`, calls `requireTestDataAlias()` or `requireTestDataProfile()`, or creates `new AuthenticationWorkflow(page)` without passing a named authentication profile. Those are the indicators that the older selectors are still required.

## Updating an existing test to use a run profile

Convert one test at a time. Do not remove the legacy configuration files while other tests still depend on them.

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
```

When a reusable role is introduced, update the sanitized run-profile example so other developers know that the role may be required. Never place real credentials in the example.

### 7. Run the converted test with one selector

Remove the legacy selectors from the command and select the intended profile:

```powershell
$env:RUN_PROFILE="c001-dev"
npx playwright test <test-path> --project=chromium --headed
```

### Conversion checklist

- [ ] The test imports and calls `requireRunProfile()` once.
- [ ] Client functional-data paths start from `runProfile.testDataPath` when applicable.
- [ ] Every `AuthenticationWorkflow` receives an explicit `runProfile.user("<role>")` value.
- [ ] Every requested role exists in the selected private run-profile JSON.
- [ ] Different simultaneous users run in different browser contexts.
- [ ] The command requires only `RUN_PROFILE` for environment, data-path, and user selection.
- [ ] Imports and variables used only by the legacy selection logic are removed from that test.
- [ ] Shared legacy configuration remains intact for other tests that still use it.

## Legacy file example

A legacy test can still use:

```powershell
$env:TEST_DATA_ALIAS="c001"
$env:CLIENT_ALIAS="c001"
$env:ENVIRONMENT="dev"
npm test
```

That legacy selection loads:

```text
environments/.env.c001.dev
```

---

# High-Level Project Structure

```text
RegressionTestScripts/
├── config/          Environment selection and configuration
├── docs/            Shared framework documentation
├── environments/    Local environment files and sanitized templates
├── pages/           Playwright Page Objects organized by application and module
├── tests/           Authentication, ERP module, and proof-of-concept tests
├── workflows/       Reusable multi-page business processes
├── types/           Shared TypeScript data definitions
├── utils/           Reusable utilities, including test-data loaders
├── test-data/       Sanitized examples and ignored environment-specific data
├── output/          Generated logs and test artifacts
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

Application-specific pages and tests are organized by product area and module. Examples include:

```text
pages/erp/gl/
tests/erp/gl/
tests/erp/ap/
```

---

# Why playwright.config.ts Remains in the Root

Playwright expects `playwright.config.ts` in the project root. Keeping it there allows standard commands to work without an additional configuration argument:

```bash
npx playwright test
npx playwright test --ui
npx playwright show-report
npx playwright codegen
```

---

# TypeScript Configuration

The root `tsconfig.json` provides shared editor settings for the Playwright and Node.js TypeScript code.

It currently enables Node type information and identifies the project folders that TypeScript should inspect. This supports consistent editor validation for imports such as `node:fs` and `node:path`.

Playwright continues to control test execution. Command-line type checking and CI enforcement are not currently configured.

The TypeScript configuration should be reviewed as the framework and build process mature.

---

# Environment Variables

The framework currently supports the run-profile configuration and a legacy compatibility configuration:

| Variable | Set in | Purpose |
| --- | --- | --- |
| `RUN_PROFILE` | Terminal | Selector for run-profile tests; selects `environments/run-profiles/<name>.json`. |
| `TEST_DATA_ALIAS` | Terminal, legacy only | Selects the legacy functional-data client folder. |
| `ENVIRONMENT` | Terminal, legacy only | Selects the legacy environment segment. |
| `CLIENT_ALIAS` | Terminal, legacy only | Selects the legacy `.env` credential file. |
| `ORACLE_BASE_URL` | Legacy credential file | Provides the fallback Fusion URL. |
| `ORACLE_USERNAME` | Legacy credential file | Provides the fallback username. |
| `ORACLE_PASSWORD` | Legacy credential file | Provides the fallback password. |

Use `RUN_PROFILE` for every new or updated test. The remaining variables document compatibility behavior and should not be copied into new test commands.

For legacy tests, the tracked `environments/.env.example` lists the supported fallback variables. Its terminal selectors are commented examples because they are not stored in credential files. Copy the credential portion only when maintaining a legacy `.env` profile.

Each local credential file contains only Oracle authentication/bootstrap values:

```env
ORACLE_BASE_URL=https://example.oraclecloud.com
ORACLE_USERNAME=myusername
ORACLE_PASSWORD=mypassword
```

Legacy selectors must be set in the terminal before running Playwright because the framework needs them to identify the `.env` file and functional-data folder. Run-profile tests replace those selectors with `RUN_PROFILE`.

Functional test values such as ledgers, accounting periods, journal names, batch names, and safety flags do not belong in `.env` files. Store those values in the applicable client/environment/module JSON file under:

```text
<run-profile testDataPath>/<module>/
```

Run profiles select the execution target and named users; functional JSON files contain business test values. They remain separate files even though one run profile points to the appropriate functional-data root.

The legacy fallback variables intentionally use the prefix **ORACLE_** to avoid conflicts with Windows environment variables such as:

```text
USERNAME
PASSWORD
```

---

# Git Ignore Rules

Real credentials and real client test data should never be committed to GitHub.

The project ignores all local environment files except the template.

```gitignore
environments/.env.*
!environments/.env.example
```

Tracked:

```text
environments/.env.example
```

Ignored:

```text
environments/.env.c001.dev
environments/.env.c001.test
environments/.env.c001.prod
```

Private run profiles are also ignored, while sanitized examples remain tracked:

```gitignore
environments/run-profiles/*.json
!environments/run-profiles/*.example.json
```

Tracked example:

```text
environments/run-profiles/demo-dev.example.json
```

Ignored private profile:

```text
environments/run-profiles/c001-dev.json
```

The project also ignores local test data by default.

```gitignore
test-data/**
!test-data/**/
!test-data/.gitkeep
!test-data/README.md
!test-data/**/*.example.*
!test-data/**/example.*
!test-data/**/.gitkeep
```

Tracked test data should be limited to sanitized examples or files intentionally approved by the team.
Example files may use either an `example.` prefix or a `.example.` filename segment so they can be committed without being confused for real client data.

Allowed examples:

```text
test-data/manual-journal.example.csv
test-data/manual-journal.example.json
test-data/attachments/TestFile.example.txt
test-data/example.manual-journal.csv
test-data/example.manual-journal.json
test-data/example.attachments/TestFile.txt
```

Ignored local files:

```text
test-data/clients/c001/dev/gl/create-journal.json
test-data/clients/c001/dev/gl/supporting-document.pdf
test-data/clients/c001/test/ap/invoice-data.csv
```

The same logic applies to the output folder for generated logs and run artifacts.

```gitignore
output/**
!output/**/
!output/.gitkeep
!output/README.md
!output/**/*.example.*
!output/**/example.*
!output/**/.gitkeep
```

Page Objects should not read test data files directly. Page Objects should receive values from tests, workflows, or data helpers.

Example:

```typescript
await createJournalPage.enterJournalBatchName(journalBatchName);
await createJournalPage.chooseAttachmentFile(attachmentFilePath);
```

This keeps the automation reusable across clients while allowing each client and environment to use its own local data.

---

# Create Journal Test Data

Create Journal tests using the current configuration load input data from the `testDataPath` in the active run profile.

```text
RUN_PROFILE
    ↓
Private run-profile JSON
    ├── baseUrl + named user credentials
    └── testDataPath
             ↓
Environment-specific functional JSON
            ↓
Create Journal data loader
            ↓
Validated TypeScript data
            ↓
Playwright test
            ↓
Create Journal Page Object
```

Runtime data follows this convention:

```text
<run-profile testDataPath>/gl/create-journal.json
```

Sanitized examples are stored under:

```text
test-data/examples/gl/
```

The test resolves and loads the data file. The data loader validates the contents and returns typed journal data. The Page Object receives the validated values and remains independent of the JSON file structure.

Current validation includes:

- Required fields must contain values.
- At least two journal lines are required.
- Each line must contain either a debit or a credit, but not both.
- Journal amounts must be positive numbers.
- Total debits must equal total credits.
- The configured attachment file must exist.

Real environment-specific data remains excluded from source control.

---

# Creating a New Run Profile

To add a new client environment for a run-profile test:

1. Copy `environments/run-profiles/demo-dev.example.json` to a private file named for the client alias and environment.

Example:

```text
environments/run-profiles/c008-dev.json
```

2. Set its functional-data path, Fusion URL, and standard user:

```json
{
  "testDataPath": "test-data/clients/c008/dev",
  "baseUrl": "<client URL>",
  "users": {
    "standardUser": {
      "username": "<username>",
      "password": "<password>"
    }
  }
}
```

3. Add any additional users required by the selected workflows. The complete `users` object for a journal creator and approver looks like this:

```json
"users": {
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
test-data/clients/c008/dev/<module>/
```

5. Select the profile when running a run-profile test:

```powershell
$env:RUN_PROFILE="c008-dev"
npx playwright test
```

The test selects `standardUser`, `glApprover`, or another named role in its TypeScript code. The command stays the same regardless of how many users the workflow uses.

For a legacy test only, create the older `.env` file and use the legacy selectors:

```text
environments/.env.c008.dev
```

```powershell
$env:TEST_DATA_ALIAS="c008"
$env:ENVIRONMENT="dev"
$env:CLIENT_ALIAS="c008"
npx playwright test <legacy-test-path>
```

---

# Framework Validation

Framework validation tests are stored within the area they validate.

Current framework validations include:

- Run-profile loading and `standardUser` resolution (`tests/authentication/test-environment.spec.ts`)
- Oracle login validation through the named `standardUser` (`tests/authentication/oracle-login.spec.ts`)
- Legacy alias separation and conditional test-data requirements (`tests/config/environment-selection.spec.ts`)
- Navigation validation

As additional framework components are introduced, validation tests should be placed alongside the functional area they support rather than in a generic framework folder.

---

# Authentication Framework

The Authentication Framework provides the reusable login process used by Oracle Fusion UI tests.

Only three components participate when a business test signs in:

1. `config/run-profile.ts` loads the selected profile and returns the requested named user's URL and credentials.
2. `pages/common/fusion-login.page.ts` interacts with the Oracle sign-in page.
3. `workflows/authentication.workflow.ts` coordinates navigation, credential submission, and Fusion home-page readiness.

The files under `tests/authentication/` are optional validation tests for these components. They are not part of the login runtime path and do not need to run before a business test.

## 1. Run-Profile Loader

Location:

```text
config/run-profile.ts
```

The loader validates the selected profile and exposes credentials by role. It does not perform browser actions and does not place profile credentials into `process.env`.

```typescript
const runProfile = requireRunProfile();
const authenticationProfile = runProfile.user("standardUser");
```

The returned authentication profile contains only `baseUrl`, `username`, and `password`. This small contract allows the login layer to work with either a named run-profile user or the legacy environment fallback.

## 2. Fusion Login Page

Location:

```text
pages/common/fusion-login.page.ts
```

This Page Object represents the Oracle Fusion login page.

Responsibilities include:

* Navigate to Oracle Fusion.
* Enter username.
* Enter password.
* Click the login button.
* Wait for the Oracle Fusion home page to become ready for automation.

The constructor accepts an optional authentication profile. Run-profile tests provide one explicitly. If none is provided, the page uses the legacy values exported by `config/environment.ts`.

The Page Object is responsible only for interacting with the login page.

It does **not** know why the application is being accessed or what business process follows.

---

## 3. Authentication Workflow

Location:

```text
workflows/authentication.workflow.ts
```

The workflow combines multiple page actions into one reusable business process.

Instead of every test calling:

```typescript
await loginPage.goto();
await loginPage.login();
await loginPage.waitForFusionHomePage();
```

tests simply execute:

```typescript
const runProfile = requireRunProfile();
const authentication = new AuthenticationWorkflow(
  page,
  runProfile.user("standardUser"),
);

await authentication.login();
```

The workflow passes the selected authentication profile to `FusionLoginPage`, opens the shared profile URL, enters that named user's credentials, and waits for the authenticated Fusion shell. This keeps role selection in the test while keeping login mechanics reusable.

### Multiple users in one test

When a business process needs more than one user, create separate browser contexts and pass a different named authentication profile to each workflow:

```typescript
const runProfile = requireRunProfile();

const creatorLogin = new AuthenticationWorkflow(
  creatorPage,
  runProfile.user("standardUser"),
);
await creatorLogin.login();

const approverContext = await browser.newContext();
try {
  const approverPage = await approverContext.newPage();
  const approverLogin = new AuthenticationWorkflow(
    approverPage,
    runProfile.user("glApprover"),
  );
  await approverLogin.login();
  // Perform only the approver's authorized actions here.
} finally {
  await approverContext.close();
}
```

Separate contexts are essential because each context has isolated cookies and session storage. Both users can remain authenticated against the same `baseUrl` without logging one another out or contaminating session state. A second page in the same context would not provide this isolation.

The framework does not automatically choose a user based on credentials or array position. Each test explicitly names the business role it requires, which makes the authorization boundary understandable during review.

## 4. Optional Authentication Validation Tests

Locations:

```text
tests/authentication/oracle-login.spec.ts
tests/authentication/test-environment.spec.ts
```

These are two different diagnostic tests:

- `test-environment.spec.ts` loads the selected run profile and resolves `standardUser`. It checks configuration selection without proving that Oracle accepts the credentials.
- `oracle-login.spec.ts` uses the normal `AuthenticationWorkflow` to open Oracle Fusion and sign in as `standardUser`. It proves that the selected profile works with the reusable login implementation.

Neither test supplies authentication state to other tests, initializes the framework, or needs to pass before another script can run. They exist so configuration and login behavior can be tested independently when setting up a profile or diagnosing an authentication problem.

---

# Login Readiness Strategy

Successful authentication is verified by waiting for the Oracle Fusion home page shell to become available.

The framework validates that the following Oracle Fusion controls are visible:

* Navigator
* Settings and Actions

This validation confirms that:

* The user is authenticated.
* Oracle Fusion has finished loading.
* The Oracle Fusion shell is available.
* The application is ready for additional automation.

Methods named `waitFor...` should validate page readiness only and should not change the application state by clicking buttons, opening menus, or performing business actions.

---

# Framework Architecture

The framework separates configuration, validated functional data, browser interaction, reusable workflows, and business assertions.

```text
RUN_PROFILE ──► Run-profile loader ──► Named authentication profile ──┐
                                                                    ├─► Business test
Functional JSON ──► Data loader ──► Validated typed data ───────────┘
                                                                         │
                                                                         ▼
                                                        Workflows and Page Objects
```

Each layer has a single responsibility.

Tests coordinate configuration, data, workflows, and page objects. A workflow is appropriate for a reusable multi-page business process; a test may use a page object directly when an additional workflow would not add business meaning.

### Environment Configuration

Provides:

* Run-profile selection
* The shared Fusion URL
* Named user credentials
* The functional-data root
* A legacy fallback for tests that have not been updated to run profiles

---

### Page Objects

Represent individual Oracle pages.

They know:

* where controls are located
* how to interact with those controls

Examples:

* Fusion Login Page
* Journals Page
* Supplier Page
* Employee Page

---

### Workflows

Represent complete Oracle business processes.

Examples:

* Authentication
* Create Manual Journal
* Create Supplier
* Hire Employee

Workflows coordinate one or more Page Objects.

---

### Tests

Business tests verify requirements.

A good test should read almost like English.

Example:

```typescript
await authentication.login();

await manualJournal.createJournal();
```

The test should describe **what** is happening rather than **how** it happens.

---

# Page Object Design Principles

Page Objects represent a single Oracle page or reusable Oracle Fusion UI component.

Each Page Object should expose meaningful user actions rather than Playwright implementation details.

Examples:

* login()
* goToCreateJournalPage()
* selectLedger()
* save()

Page Objects should:

* Know where controls are located.
* Know how to interact with those controls.
* Hide locator implementation details.
* Return the page in a predictable state.

Tests and workflows should never interact with Playwright locators directly.

Methods named `waitFor...` should only validate page readiness and should not change the application state.

---

# Synchronization Strategy

The framework avoids arbitrary delays whenever possible.

Instead of using fixed waits such as:

```typescript
await page.waitForTimeout(5000);
```

the framework waits for application conditions required for the next action.

Examples include:

* Elements becoming visible.
* Elements becoming enabled.
* Oracle Fusion pages reaching a ready state.

Synchronization should always be based on the application state rather than elapsed time.

Increasing global timeouts should be considered only after verifying that the application legitimately requires additional time to complete an operation.

---

# Git Workflow

Development follows a feature branch workflow.

## 1. Update Main

```bash
git switch main
git pull origin main
```

---

## 2. Create a Feature Branch

Example:

```bash
git switch -c bryan/<feature-name>
```

Each feature should have its own branch.

Feature branches should be created from the latest version of the `main` branch after synchronizing with the remote repository.

Examples:

* bryan/playwright-setup
* bryan/manual-journal
* bryan/api-testing

---

## 3. Develop and Test

Make changes locally.

Run tests until everything passes.

---

## 4. Commit Changes

```bash
git status
git add <intended-files>
git diff --cached --check
git commit -m "Describe the completed change"
```

Commits should represent one logical feature.

---

## 5. Push Branch

```bash
git push -u origin <branch-name>
```

---

## 6. Create a Pull Request

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

## Pull Request Review Flow

After a PR is opened:

1. The GitHub review agent checks PRs hourly.
2. If the PR is clean, the agent may approve or merge it.
3. If the PR is blocked, the developer fixes the issue and pushes updates.
4. The agent rechecks within the next hourly review cycle.
5. A coworker with permission may manually approve or override if needed.

---

# Coding Standards

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

# Pull Request Checklist

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

# Future Enhancements

Potential team-level framework enhancements include:

- Standardize reusable workflows, shared utilities, and test-data patterns.
- Define when automation should use Playwright UI, Oracle APIs, or a hybrid approach.
- Provide a functional-user interface for preparing test data and selecting scripts.
- Introduce CI/CD, reporting, and safe parallel execution when the framework is ready.
