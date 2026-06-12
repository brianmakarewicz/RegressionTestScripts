@"

\# RegressionTestScripts



Playwright automation framework for regression testing.



\## Setup



Install dependencies:



npm install



\## Run Tests



Run all tests:



npx playwright test



Run in UI mode:



npx playwright test --ui



Run Chromium only:



npx playwright test --project=chromium



\## Folder Structure



tests/      Playwright test files

pages/      Page Object Models

workflows/  Reusable business processes

utils/      Helper functions

test-data/  CSV and JSON test data

"@ | Set-Content README.md

