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
| C001  | Client 1      |
| C002  | Client 2      |
| C003  | Client 3      |
| C004  | Client 4      |
| C005  | Client 5      |
| C006  | Client 6      |
| C007  | Client 7      |

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

# Current Project Structure

```text
RegressionTestScripts/
│
├── config/
│   └── environment.ts
│
├── docs/
│   └── architecture-guide.md
│
├── environments/
│   └── .env.example
│
├── pages/
│   ├── common/
│   │   ├── fusion-login.page.ts
│   │   └── fusion-navigator.page.ts
│   │
│   └── erp/
│       └── gl/
│           └── create-journal.page.ts
│
├── workflows/
│   └── authentication.workflow.ts
│
├── tests/
│   ├── authentication/
│   │   ├── oracle-login.spec.ts
│   │   └── test-environment.spec.ts
│   │
│   └── erp/
│       └── gl/
│           └── create-journal-navigation.spec.ts
│
├── utils/
│
├── test-data/
│
├── playwright.config.ts
│
└── package.json
```

As the framework grows, additional folders will be organized by Oracle module (GL, AP, HCM, SCM, etc.).

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

# Environment Configuration

Environment configuration is managed through:

```text
config/environment.ts
```

This file is responsible for:

1. Reading the selected client alias.
2. Reading the selected environment.
3. Building the correct environment file name.
4. Loading the environment variables using dotenv.

Example:

```powershell
$env:CLIENT_ALIAS="c001"
$env:ENVIRONMENT="dev"
npm test
```

The framework automatically loads:

```text
environments/.env.c001.dev
```

No code changes are required when switching between clients or environments.

---

# Environment Variables

Each local environment file contains:

```env
CLIENT_ALIAS=c001
ENVIRONMENT=dev

ORACLE_BASE_URL=https://example.oraclecloud.com
ORACLE_USERNAME=myusername
ORACLE_PASSWORD=mypassword
```

The variables intentionally use the prefix **ORACLE_** to avoid conflicts with Windows environment variables such as:

```text
USERNAME
PASSWORD
```

---

# Git Ignore Rules

Real credentials should never be committed to GitHub.

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

# Git Workflow

Development follows a feature branch workflow.

## 1. Update Main

```bash
git checkout main
git pull
```

---

## 2. Create a Feature Branch

Example:

```bash
git checkout -b bryan/manual-journal
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
git add .
git commit -m "Add manual journal workflow"
```

Commits should represent one logical feature.

---

## 5. Push Branch

```bash
git push
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

# Future Enhancements

Planned enhancements include:

* Complete Create Journal page object
* Manual Journal workflow
* CSV-driven data processing
* Looping through multiple journal entries
* Shared Oracle utilities
* API automation framework
* Reporting enhancements
* CI/CD integration
* Parallel execution strategy
* Test result dashboards
* Screenshot and video capture for failed tests
