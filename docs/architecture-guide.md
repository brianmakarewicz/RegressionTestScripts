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

# Client Alias Convention

Real client names should never appear in:

* Folder names
* File names
* Branch names
* Test names
* Comments
* Configuration files committed to GitHub

Instead, client aliases are used.

| Alias | Actual Client |
| ----- | ------------- |
| c001  | Client 1      |
| c002  | Client 2      |
| c003  | Client 3      |
| c004  | Client 4      |
| c005  | Client 5      |
| c006  | Client 6      |
| c007  | Client 7      |

The actual client mapping should be maintained outside of GitHub.

---

# Environment Naming Convention

Each client supports multiple environments.

Current environments:

* dev
* test
* prod

Environment files follow this convention:

```text
.env.c001.dev
.env.c001.test
.env.c001.prod

.env.c002.dev
.env.c002.test
.env.c002.prod
```

Example:

```text
environments/
├── .env.c001.dev
├── .env.c001.test
├── .env.c001.prod
```

When running tests, the desired client and environment are selected from the command line.

Example:

```powershell
$env:CLIENT_ALIAS="c001"
$env:ENVIRONMENT="dev"
npm test
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

Playwright expects:

```text
playwright.config.ts
```

to exist in the project root.

Keeping it in the root allows all standard Playwright commands to work without additional configuration.

Examples:

```bash
npx playwright test

npx playwright test --ui

npx playwright show-report

npx playwright codegen
```

Moving the configuration file would require passing a custom configuration path for every Playwright command.

---

# TypeScript Configuration

The root `tsconfig.json` provides shared editor settings for the Playwright and Node.js TypeScript code.

It currently enables Node type information and identifies the project folders that TypeScript should inspect. This supports consistent editor validation for imports such as `node:fs` and `node:path`.

Playwright continues to control test execution. Command-line type checking and CI enforcement are not currently configured.

The TypeScript configuration should be reviewed as the framework and build process mature.

---

# Environment Configuration

Environment configuration is managed through:

```text
config/environment.ts
```

This file is responsible for:

1. Reading the selected client alias.
2. Reading the selected environment.
3. Reading an optional authentication alias.
4. Building the correct authentication environment file name.
5. Loading the environment variables using dotenv.

Example:

```powershell
$env:CLIENT_ALIAS="c001"
$env:ENVIRONMENT="dev"
npm test
```

By default, the framework automatically loads:

```text
environments/.env.c001.dev
```

No code changes are required when switching between clients or environments.

## Test-data client and authentication profile

`CLIENT_ALIAS` and `AUTHENTICATION_ALIAS` have separate responsibilities:

- `CLIENT_ALIAS` selects the client folder containing functional JSON test data.
- `AUTHENTICATION_ALIAS` optionally selects a different local credential profile.
- If `AUTHENTICATION_ALIAS` is omitted, it defaults to `CLIENT_ALIAS`.

This separation supports workflows in which multiple users act on the same client data. For example, an initiating user and an approver can share JSON under one client folder while loading different credentials.

```powershell
$env:CLIENT_ALIAS="c001"
$env:ENVIRONMENT="dev"
$env:AUTHENTICATION_ALIAS="c001Approver"
npx playwright test tests/erp/gl/approve-journal.spec.ts --project=chromium --headed
```

That command loads functional data from:

```text
test-data/clients/c001/dev/
```

and credentials from:

```text
environments/.env.c001approver.dev
```

To return to the default client credentials in the same PowerShell session, either set the authentication alias to the client alias or remove the override:

```powershell
$env:AUTHENTICATION_ALIAS="c001"
```

```powershell
Remove-Item Env:AUTHENTICATION_ALIAS -ErrorAction SilentlyContinue
```

Do not change `CLIENT_ALIAS` merely to select another user. Doing so would also select a different functional test-data folder.

---

# Environment Variables

Each local environment file contains only environment selection metadata and authentication/bootstrap values:

```env
CLIENT_ALIAS=c001
ENVIRONMENT=dev

ORACLE_BASE_URL=https://example.oraclecloud.com
ORACLE_USERNAME=myusername
ORACLE_PASSWORD=mypassword
```

Functional test values such as ledgers, accounting periods, journal names, batch names, and safety flags do not belong in `.env` files. Store those values in the applicable client/environment/module JSON file under:

```text
test-data/clients/<client-alias>/<environment>/<module>/
```

Environment files are authentication profiles. Functional JSON files are test-data profiles. Keep these concerns separate even when their aliases happen to match.

The variables intentionally use the prefix **ORACLE_** to avoid conflicts with Windows environment variables such as:

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

Create Journal tests load input data from a JSON file selected by the active client alias and environment.

```text
CLIENT_ALIAS + ENVIRONMENT
            ↓
Environment-specific JSON file
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
test-data/clients/<client-alias>/<environment>/gl/create-journal.json
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

# Creating a New Client Environment

To add a new client environment, create a new local file.

Example:

```text
environments/.env.c008.dev
```

Contents:

```env
CLIENT_ALIAS=c008
ENVIRONMENT=dev

ORACLE_BASE_URL=<client url>
ORACLE_USERNAME=<username>
ORACLE_PASSWORD=<password>
```

No code changes are required.

---

# Framework Validation

Framework validation tests are stored within the area they validate.

Current framework validations include:

- Authentication environment validation (`tests/authentication`)
- Oracle login validation
- Navigation validation

As additional framework components are introduced, validation tests should be placed alongside the functional area they support rather than in a generic framework folder.

---

# Authentication Framework

The Authentication Framework is the first reusable business component built on top of the Playwright framework.

Its purpose is to provide a single reusable login process that every Oracle Fusion UI test can use.

The authentication layer consists of three components.

## 1. Fusion Login Page

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

The Page Object is responsible only for interacting with the login page.

It does **not** know why the application is being accessed or what business process follows.

---

## 2. Authentication Workflow

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
const authentication = new AuthenticationWorkflow(page);

await authentication.login();
```

This significantly improves readability and reduces duplicated code.

---

## 3. Authentication Test

Location:

```text
tests/authentication/oracle-login.spec.ts
```

The authentication test validates that:

* The correct environment configuration is loaded.
* Oracle Fusion opens successfully.
* The configured user can authenticate successfully.

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

The framework follows a layered architecture.

```text
Environment Configuration
            │
            ▼
Page Objects
            │
            ▼
Workflows
            │
            ▼
Business Tests
```

Each layer has a single responsibility.

Each layer should depend only on the layer directly beneath it. Tests should not bypass Workflows to interact directly with Page Objects unless the workflow layer does not add business value.

### Environment Configuration

Provides:

* URLs
* Credentials
* Environment selection

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
