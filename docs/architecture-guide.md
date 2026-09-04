# Playwright Architecture Guide

## Overview

This repository contains a Playwright automation framework designed to automate testing across multiple Oracle Fusion Cloud clients while keeping client-specific information and credentials out of source control.

The established framework documented here uses Playwright for Oracle Fusion UI testing. Taylor Wood's separate accounts-payable API work is outside the scope of the Playwright UI architecture described in this guide.

The framework is designed around reusability, maintainability, and security. The goal is to develop automation once and execute it against multiple clients and multiple environments with little or no code changes.

Related guides:

- [Run-Profile Adoption Guide](run-profile-adoption-guide.md) — updating an existing test and creating its private run profile.
- [Development Workflow](development-workflow.md) — Git workflow, coding standards, and pull-request checks.

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

# Current Run-Profile Test Architecture

The following summary shows the preferred run-profile path. The legacy authentication path is documented separately under **Legacy Authentication and Backward Compatibility**.

The framework separates configuration, validated functional data, browser interaction, reusable workflows, and business assertions.

| Stage | Input | Component | Output or action |
| --- | --- | --- | --- |
| 1. Select the environment | `RUN_PROFILE` | Run-profile loader | Provides the Fusion URL, named users, and functional-data root. |
| 2. Select authentication | Role requested by the test, such as `standardUser` | `runProfile.user(...)` | Provides the named authentication profile used for login. |
| 3. Load business data | Functional JSON below `runProfile.testDataPath` | Data loader | Validates the file and returns typed test data. |
| 4. Coordinate the scenario | Named authentication profile and validated test data | Business test | Passes login information to the authentication workflow and business values to the appropriate Page Objects. |
| 5. Automate Oracle Fusion | Instructions from the business test | Workflows and Page Objects | Perform the login and the requested Oracle Fusion business actions. |

The two inputs meet at the business test:

```text
Named authentication profile ──┐
                               ├──► Business test ──► Workflows and Page Objects
Validated functional data ─────┘
```

Each layer has a single responsibility.

Tests coordinate configuration, data, workflows, and page objects. A workflow is appropriate for a reusable multi-page business process; a test may use a page object directly when an additional workflow would not add business meaning.

## Oracle Fusion Page Objects

Represent individual Oracle pages.

They know:

* where controls are located
* how to interact with those controls

Examples:

- `FusionLoginPage`
- `FusionNavigatorPage`
- `CreateJournalPage`
- `ManageJournalsPage`

---

## Reusable Business Workflows

Represent complete Oracle business processes.

The current reusable workflow is `AuthenticationWorkflow`, which coordinates `FusionLoginPage`. Add another workflow only when a business process spanning one or more Page Objects is reused by multiple tests or becomes clearer as a named operation.

---

## Business Tests

Business tests verify requirements.

A good test should read almost like English.

Example:

```typescript
await authentication.login();
await navigatorPage.goToCreateJournalPage();
await createJournalPage.enterJournalBatchName(journalBatchName);
await createJournalPage.saveAndClose();
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

# Authentication Framework

This chapter explains how a test selects its environment, loads functional data, chooses a named user, and signs in to Oracle Fusion. The separate [Run-Profile Adoption Guide](run-profile-adoption-guide.md) contains the step-by-step implementation procedure.

## Selecting a Run Profile by Name

Before an Oracle Fusion test can sign in, the authentication framework needs to know which Fusion environment to open and which user the test requires. The run profile provides that information. It also points the test to the functional-data folder for the same client environment, keeping authentication and test-data selection aligned through one command value.

The naming convention in this section defines how a developer selects that run profile when starting a test.

### What a Run Profile Contains

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
        └── demo-dev.json          Private local profile ignored by Git
```

Set the PowerShell environment variable `RUN_PROFILE` to the filename of the profile you want to use, omitting the `.json` extension:

```text
RUN_PROFILE=demo-dev
            │
            └── loads environments/run-profiles/demo-dev.json
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
| `demo-dev` | Demo client, development environment |

The actual client mapping should be maintained outside of GitHub.

---

## Authentication Configuration Files

### Responsibilities of the Three Files Under `config/`

These files have different responsibilities despite all being related to authentication configuration:

| File | What it does | What a test developer does with it |
| --- | --- | --- |
| `config/run-profile.ts` | Reads the `RUN_PROFILE` value from the command, opens the matching `.json` file under `environments/run-profiles/`, validates it, and provides the selected URL, test-data path, and named users. | Add an import statement at the top of a test, then call `requireRunProfile()` inside the test. This is how the test receives the profile selected by the command. |
| `config/authentication-profile.ts` | Defines the shared TypeScript contract for login information: a URL, username, and password. It does not contain actual values or perform login actions. | Normally, do nothing with this file when writing a test. The loader, workflow, and login Page Object use its definition internally. |
| `config/environment.ts` | Loads credentials using the older `.env` method when a test has not yet been changed to use `RUN_PROFILE`. This keeps those existing tests working. | Leave it in an older test until that test is updated. Do not add it to a test that uses `requireRunProfile()` unless framework-level fallback behavior is being maintained. |

In TypeScript, **importing** means adding a statement at the top of a file so that code from another file can be used. For this framework, the test adds:

```typescript
import { requireRunProfile } from "../../../config/run-profile";
```

The exact number of `../` segments depends on where the test file is located. After that line is added, the test can call:

```typescript
const runProfile = requireRunProfile();
```

The preferred path is therefore:

```text
Test
  → config/run-profile.ts                 loads and validates the selected profile and user
  → AuthenticationWorkflow               performs login using those values
```

`config/authentication-profile.ts` is not an execution step in that path. It provides the shared TypeScript definition used by the files that prepare and use login information.

### How `authentication-profile.ts` Defines the Login Contract

`config/authentication-profile.ts` defines the common TypeScript contract `{ baseUrl, username, password }`. It contains no credentials and executes no code. The loader returns values that satisfy this contract, while the workflow and login Page Object accept the same contract. This prevents those components from developing incompatible ideas about what login information contains.

Actual values travel directly through the runtime path:

```text
runProfile.user("standardUser")
        provides URL + username + password
                    ↓
AuthenticationWorkflow
        receives the information
                    ↓
FusionLoginPage
        uses the information to sign in
```

The credentials do not pass through `authentication-profile.ts`; TypeScript uses its definition while developers write and validate the code.

The compatibility path is:

```text
Legacy test
  → config/environment.ts                 loads the older .env configuration
  → AuthenticationWorkflow(page)          uses those fallback values
```

`config/authentication-profile.ts` is shared by the framework but is not an alternative configuration path. `config/environment.ts` and `config/run-profile.ts` are alternative ways of sourcing configuration: the first is retained for older tests, and the second is the required choice for new tests.

`FusionLoginPage` still imports `config/environment.ts` because it must support legacy callers that do not pass credentials. When `RUN_PROFILE` is set, `environment.ts` recognizes the run-profile selection and does not require or load the legacy `.env` file. A new test passes `runProfile.user(...)` explicitly, and those explicit values take precedence over the fallback.

The TypeScript entry point used by a run-profile test is:

```text
config/run-profile.ts
```

`config/run-profile.ts` exports the `requireRunProfile()` function. When a test calls that function, it reads the PowerShell environment variable named `RUN_PROFILE`, converts its value to lowercase, and verifies that the value is safe to use as a filename. It then adds the `.json` extension and loads the matching file from:

```text
environments/run-profiles/<run-profile>.json
```

For example, `RUN_PROFILE=demo-dev` loads `environments/run-profiles/demo-dev.json`.

The contents of that file look like this:

```json
{
  "testDataPath": "test-data/clients/demo/dev",
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

## Run-Profile Test Startup Walkthrough

Consider this command:

```powershell
$env:RUN_PROFILE="demo-dev"
npx playwright test tests/erp/gl/create-journal-save-close.spec.ts `
  --project=chromium `
  --headed
```

The flow is:

1. PowerShell stores the text `demo-dev` in the environment variable `RUN_PROFILE` for the current terminal session.
2. Playwright starts only `tests/erp/gl/create-journal-save-close.spec.ts` because that exact test file was supplied in the command.
3. The test imports `requireRunProfile` from `config/run-profile.ts` and calls it:

   ```typescript
   const runProfile = requireRunProfile();
   ```

4. `requireRunProfile()` reads `process.env.RUN_PROFILE`. Node exposes the PowerShell value there, so the function receives `demo-dev`. Playwright itself does not choose or interpret the profile name.
5. `config/run-profile.ts` adds the `.json` extension and constructs this path from the repository working directory:

   ```text
   <repository>/environments/run-profiles/demo-dev.json
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

   If `testDataPath` is `test-data/clients/demo/dev`, the resulting file is:

   ```text
   <repository>/test-data/clients/demo/dev/gl/create-journal.json
   ```

8. The run-profile loader does not decide which user a test needs. The test makes that decision by requesting a named role. This Create Journal script contains this call:

   ```typescript
   runProfile.user("standardUser")
   ```

   Therefore, this script requires the `standardUser` entry in `demo-dev.json`. If that user is missing, the loader stops with an error that lists the available names.
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

The `users` value is an object keyed by business role so selection never depends on array order. All users in one profile share its `baseUrl`; a user who signs in through another URL belongs in a different run profile.

Real run-profile files are ignored by Git because they currently contain credentials. Only sanitized files ending in `.example.json` may be committed.

## Run-Profile Loading and Validation

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

## Why Users Are Stored by Role Instead of in an Array

All users for one client environment are stored in the same run profile because they share the profile's Fusion URL and functional-data root. This lets one `RUN_PROFILE` value select the complete execution environment without requiring additional terminal variables for individual users.

Within the profile, `users` is a JSON object keyed by business role:

```json
{
  "users": {
    "standardUser": { "username": "...", "password": "..." },
    "glApprover": { "username": "...", "password": "..." },
    "readOnlyAuditor": { "username": "...", "password": "..." }
  }
}
```

This structure allows a test to request exactly the role it requires:

```typescript
runProfile.user("standardUser");
runProfile.user("glApprover");
```

An array would make the relationship less direct:

```json
{
  "users": [
    { "role": "standardUser", "username": "...", "password": "..." },
    { "role": "glApprover", "username": "...", "password": "..." }
  ]
}
```

With an array, the framework would need to search the entries for a matching `role`, validate that roles are not duplicated, and avoid relying on positions such as `users[0]`. Array order could change as users are added or rearranged, while a named property remains stable.

The object therefore gives each role a unique lookup key, makes the required user visible in the test, and produces clearer errors when a role is missing. New roles can be added without changing `RUN_PROFILE`, the command used to start the test, or existing role lookups.

Tests should request only the roles they use. Role names should describe business responsibility rather than a person's name so the same test remains understandable across clients.

## Legacy Authentication and Backward Compatibility

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

### How to Identify Which Authentication Method a Test Uses

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

## Oracle Fusion Login Readiness

Successful authentication is verified by waiting for the Oracle Fusion home page shell to become available.

The framework validates that the following Oracle Fusion controls are visible:

* Navigator
* Settings and Actions

This validation confirms that:

* The user is authenticated.
* Oracle Fusion has finished loading.
* The Oracle Fusion shell is available.
* The application is ready for additional automation.

The general rule that readiness methods verify state without performing business actions is documented under [Page Object Design Principles](#page-object-design-principles).

---

## Authentication Framework Validation

The following diagnostic tests validate individual parts of the authentication framework:

- `tests/authentication/test-environment.spec.ts` confirms that the selected run profile loads and that `standardUser` can be resolved. It does not contact Oracle Fusion.
- `tests/authentication/oracle-login.spec.ts` uses the normal `AuthenticationWorkflow` to confirm that Oracle Fusion accepts the selected `standardUser` credentials.
- `tests/config/environment-selection.spec.ts` confirms that the legacy environment selectors still work when `RUN_PROFILE` is not set.

These tests do not initialize the framework, create authentication state for business tests, or need to run before a business test. They are troubleshooting tools for confirming configuration selection, login behavior, and backward compatibility independently.

Keep future framework validation tests near the component or functional area they validate rather than placing every validation in a generic framework folder.

---

# Root Playwright Configuration

Playwright expects `playwright.config.ts` in the project root. Keeping it there allows standard commands to work without an additional configuration argument:

```powershell
npx playwright test <test-path>
npx playwright test <test-path> --ui
npx playwright show-report
npx playwright codegen
```

These examples show that Playwright discovers the root configuration automatically. Select the appropriate run-profile or legacy configuration before starting a test, and check the functional guide before running a data-changing business script.

---

# TypeScript Configuration

The root `tsconfig.json` provides shared editor settings for the Playwright and Node.js TypeScript code.

It currently enables Node type information and identifies the project folders that TypeScript should inspect. This supports consistent editor validation for imports such as `node:fs` and `node:path`.

Playwright continues to control test execution. Command-line type checking and CI enforcement are not currently configured.

---

# Legacy Environment Variables

Run-profile tests use only `RUN_PROFILE`, as described in the Authentication Framework section. The following variables exist only for tests that still use the legacy configuration path:

| Variable | Set in | Legacy purpose |
| --- | --- | --- |
| `TEST_DATA_ALIAS` | Terminal | Selects the client functional-data folder. |
| `ENVIRONMENT` | Terminal | Selects the environment segment. |
| `CLIENT_ALIAS` | Terminal | Selects the matching `.env` credential file. |
| `ORACLE_BASE_URL` | Legacy `.env` file | Provides the fallback Fusion URL. |
| `ORACLE_USERNAME` | Legacy `.env` file | Provides the fallback username. |
| `ORACLE_PASSWORD` | Legacy `.env` file | Provides the fallback password. |

Functional values such as ledgers, accounting periods, journal names, and safety flags belong in module JSON files below the selected functional-data root—not in environment variables or credential files.

---

# Protecting Private Configuration and Test Data

Real credentials, client test data, and generated output must remain outside source control. The Git-ignore rules allow only explicitly sanitized examples in these areas:

| Area | Ignored private pattern or example | Tracked example or exception |
| --- | --- | --- |
| Legacy credentials | `environments/.env.*` | `environments/.env.example` |
| Run profiles | `environments/run-profiles/*.json` | `environments/run-profiles/*.example.json` |
| Client test data | `test-data/**` | Sanitized files matching `*.example.*` or `example.*` |
| Generated output | `output/**` | Sanitized files matching `*.example.*` or `example.*`; explicitly retained proof-of-concept fixtures are noted below. |

Examples of private files that must not be committed include:

```text
environments/.env.demo.dev
environments/run-profiles/demo-dev.json
test-data/clients/demo/dev/gl/create-journal.json
test-data/clients/demo/dev/gl/supporting-document.pdf
```

Before committing a new example, confirm that it contains no real client name, URL, username, password, or client-specific business data.

`output/python-output.json` and `output/demo/example.ap_inv_INV-10012_log.json` are intentionally tracked fixtures from Taylor Wood's separate development work. They contain no sensitive data the team needs to protect. Further documentation for those fixtures belongs with that work.

---

# Functional Test Data: Create Journal Example

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
