# RegressionTestScripts

Playwright automation framework for regression testing.

## Setup

Install the Node.js dependencies declared in `package.json`, then install the Playwright browser binaries:

```powershell
npm install
npx playwright install
```

The accounts-payable API work under `tests/erp/ap/create-invoice.py` uses separate Python dependencies. Install these only when working with that API code:

```powershell
py -m pip install requests python-dotenv
```

## Run a Test

Most current tests use a private run profile. Before running the example, copy `environments/run-profiles/demo-dev.example.json` to the ignored private file `environments/run-profiles/demo-dev.json` and replace its placeholder values. See the [Run-Profile Adoption Guide](docs/run-profile-adoption-guide.md) for the complete setup.

Select the profile, then provide the exact test file:

```powershell
$env:RUN_PROFILE="demo-dev"
npx playwright test tests/erp/gl/create-journal-save-close.spec.ts --project=chromium --headed
```

Do not assume that running the entire suite requires only one configuration. Some tests still use the legacy environment variables, and individual business tests may have data or Oracle-state prerequisites. See the [Run-Profile Adoption Guide](docs/run-profile-adoption-guide.md) for configuration and the [Oracle Fusion GL Development Notes](docs/gl-development-notes.md) for GL prerequisites.

To use Playwright UI mode with the demo profile, start it with the profile selected and then choose only a test that uses the run-profile framework. Tests that still use legacy configuration may require different terminal variables.

```powershell
$env:RUN_PROFILE="demo-dev"
npx playwright test --ui
```

To open the report from the most recent Playwright run:

```powershell
npx playwright show-report
```

## Folder Structure

```text
RegressionTestScripts/
│
├── config/          Configuration loaders and shared authentication types
├── docs/            Architecture, adoption, workflow, and GL guides
├── environments/    Ignored private configuration and tracked examples
├── pages/           Page Objects
├── tests/           Playwright tests organized by functional area
├── workflows/       Reusable business processes
├── types/           Shared TypeScript data definitions
├── utils/           Data loaders and helper functions
└── test-data/       Ignored client data and tracked sanitized examples
```

## Documentation

For framework design, configuration responsibilities, authentication flow, and test-data architecture, see:

[Architecture Guide](docs/architecture-guide.md)

For converting an existing test to the run-profile framework or creating a private run profile, see:

[Run-Profile Adoption Guide](docs/run-profile-adoption-guide.md)

For the Git workflow, coding standards, and pull-request checklist, see:

[Development Workflow](docs/development-workflow.md)

For implemented General Ledger scripts, prerequisites, run sequences, validation history, and Oracle UI findings, see:

[Oracle Fusion GL Development Notes](docs/gl-development-notes.md)
