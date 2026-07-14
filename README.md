# RegressionTestScripts

Playwright automation framework for regression testing.

## Setup

Install dependencies:

```bash
npm install
```
```
npm install dotenv
```
```bash
npm install --save-dev @types/node
```
```bash
npm install csv-parse
```
```bash
py -m pip install requests python-dotenv
```
```bash
npm install -D @types/node
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

## Documentation

For detailed framework setup, environment configuration, naming conventions, and team workflow, see:

[Architecture Guide](docs/architecture-guide.md)
