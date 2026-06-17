# Playwright Framework Guide

## Overview

This repository contains a Playwright automation framework designed to support multiple Oracle Cloud clients while keeping client-specific information and credentials out of source control.

The framework supports both:

* UI Testing
* API Testing

The intention is to create reusable automation that can be executed against multiple clients and environments without modifying test code.

---

# Design Goals

The framework was designed with the following goals:

1. Reuse the same automation across multiple clients.
2. Prevent client names from appearing in source control.
3. Prevent credentials from being committed to GitHub.
4. Allow each developer to maintain their own local environment configuration.
5. Separate framework configuration from Playwright configuration.
6. Support multiple environments (Dev, Test, Prod) per client.

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

Example:

| Alias | Actual Client |
| ----- | ------------- |
| C001  | Client 1      |
| C002  | Client 2      |
| C003  | Client 3      |
| C004  | Client 4      |
| C005  | Client 5      |
| C006  | Client 6      |
| C007  | Client 7      |

The actual mapping should be maintained outside of GitHub.

---

# Environment Naming Convention

Each client can have multiple environments:

* dev
* test
* prod

Environment files follow this naming convention:

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

---

# Folder Structure

```text
RegressionTestScripts/
│
├── config/
│   └── environment.ts
│
├── environments/
│   └── .env.example
│
├── pages/
│
├── workflows/
│
├── utils/
│
├── test-data/
│
├── tests/
│   └── frameworks/
│
├── playwright.config.ts
│
└── package.json
```

---

# Why playwright.config.ts Remains in the Root

Playwright expects:

```text
playwright.config.ts
```

to exist in the project root.

Keeping it in the root allows the following commands to work without additional configuration:

```bash
npx playwright test
npx playwright test --ui
npx playwright show-report
```

Moving the file would require passing custom configuration paths to Playwright commands.

---

# Environment Configuration

Environment configuration is managed through:

```text
config/environment.ts
```

This file:

1. Reads the selected client alias.
2. Reads the selected environment.
3. Builds the appropriate environment file path.
4. Loads the corresponding environment file using dotenv.

Example:

```powershell
$env:CLIENT_ALIAS="c001"
$env:ENVIRONMENT="dev"
npm test
```

This causes the framework to load:

```text
environments/.env.c001.dev
```

---

# Environment Variables

The framework uses the following variables:

```env
CLIENT_ALIAS=c001
ENVIRONMENT=dev

ORACLE_BASE_URL=https://example.oraclecloud.com
ORACLE_USERNAME=myuser
ORACLE_PASSWORD=mypassword
```

The prefix `ORACLE_` is used intentionally to avoid collisions with operating system variables such as:

```text
USERNAME
PASSWORD
```

---

# Git Ignore Rules

The framework prevents real environment files from being committed.

```gitignore
environments/.env.*
!environments/.env.example
```

This means:

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

# Framework Validation Test

A framework validation test exists under:

```text
tests/frameworks/
```

This test is used to verify:

* Environment variables load correctly.
* The correct environment file is selected.
* The framework configuration behaves as expected.

This is not a business test and should not be used as a client regression test.

---

# Git Workflow

1. Pull latest changes from main.

```bash
git checkout main
git pull
```

2. Create a feature branch.

```bash
git checkout -b bryan/feature-name
```

3. Commit changes.

```bash
git add .
git commit -m "Description of change"
```

4. Push branch.

```bash
git push
```

5. Create Pull Request.

6. Merge after approval.

---

# Future Enhancements

Planned enhancements include:

* Login Page Object Model
* Oracle-specific workflows
* API testing framework
* Shared utilities
* Test data management
* Reporting enhancements
* CI/CD integration
