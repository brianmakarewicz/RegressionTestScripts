# RegressionTestScripts

Playwright automation framework for regression testing.

## Setup

Install dependencies:

```bash
npm install
```

## Run Tests

Run all tests:

```bash
npx playwright test
```

Run in UI mode:

```bash
npx playwright test --ui
```

Run Chromium only:

```bash
npx playwright test --project=chromium
```

## Folder Structure

```text
RegressionTestScripts/
│
├── tests/       Playwright test files
├── pages/       Page Object Models
├── workflows/   Reusable business processes
├── utils/       Helper functions
└── test-data/   CSV and JSON test data
```
