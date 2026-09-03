# Oracle Fusion GL Development Notes

> This committed document intentionally uses role-based and environment-based placeholders. Keep real client names, aliases, usernames, URLs, ledger names, account values, and alias mappings outside source control.

## Client Validation and Functional-Team Escalation

- Validate each script against every supported client environment that has sufficient data and access.
- Record unresolved requirements by script and client: test data, environment configuration, permissions, approval routing, and additional user roles.
- Escalate documented gaps to the functional team only after confirming they cannot be resolved from the repository, Oracle configuration, or available test data.
- Run tests only against an explicitly selected client and environment, and record the results. Run dependent or data-changing workflows serially because several GL tests create, post, reverse, withdraw, or delete data.

## Terms Used in These Notes

- **Journal Batch:** Oracle container that groups one or more journals. Several tests transfer its exact name between independent runs.
- **ADF:** Oracle Application Development Framework, the web UI used by Fusion. ADF refreshes controls and tables asynchronously, so tests use state-based waits instead of fixed delays.
- **ADFdi:** Oracle ADF Desktop Integration, the Excel add-in used to prepare and upload spreadsheet journal data.
- **Scheduled Processes / ESS:** Oracle's background-job system. A submitted process can launch another child process, so tests capture and follow exact process IDs.
- **Run profile:** `RUN_PROFILE` selects one ignored JSON file under `environments/run-profiles/`. That file supplies the Fusion URL, functional-data path, and named users required by the test.
- **Standard user:** `standardUser` is the normal creator or operator account in a run profile.
- **GL approver:** `glApprover` is the independently authenticated approval account in a run profile. Only tests that perform approval use it.
- **Legacy selectors:** `CLIENT_ALIAS`, `TEST_DATA_ALIAS`, and `ENVIRONMENT` remain supported for scripts outside the migrated GL suite; they are not the normal interface documented for these GL scripts.

## Implemented Scripts

Each script uses the same documentation order: Relevant files, Purpose, Test data and prerequisites, Workflow and validation, Run command, Critical findings, and Status. Multi-script orchestration is documented under Multi-Script Manual Sequences.

### Create Journal — Save and Close

Relevant files:

- `pages/erp/gl/create-journal.page.ts`
- `tests/erp/gl/create-journal-save-close.spec.ts`
- `types/erp/gl/create-journal-data.ts`
- `utils/erp/gl/load-create-journal-data.ts`

Purpose:

Create a unique manual journal from environment-specific JSON data and save it without completing or posting it.

Test data and prerequisites:

- Runtime data: `<run-profile testDataPath>/gl/create-journal.json`
- Sanitized example: `test-data/examples/gl/create-journal.example.json`
- JSON supplies the batch-name prefix, descriptions, balance type, accounting period, attachment, ledger, category, accounts, amounts, and line descriptions.
- Lines must balance, account combinations must be valid, and the attachment must resolve to a safe existing file.
- The run profile's `standardUser` must have access to create and save journals for the configured ledger.

Workflow and validation:

1. Load and validate the selected environment's JSON.
2. Generate a unique batch name from the configured prefix and timestamp.
3. Sign in and navigate to Create Journal.
4. Enter the batch, header, attachment, ledger, category, and balanced lines.
5. Commit the final grid edit and select Save > Save and Close.
6. Record the generated batch name when another independent test will use it.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/create-journal-save-close.spec.ts --project=chromium --headed
```

Critical findings:

- Oracle may ignore Save and Close while the last grid cell is still being edited. The test commits that value before opening the Save menu.
- Generated batch names are not passed automatically to later tests; copy the exact name from console output or Playwright evidence.

Status:

- Complete: JSON loading, unique naming, journal entry, attachment handling, and Save and Close validation are implemented.
- Validation: passed using a creator with access to create and save journals for the configured ledger.

### Create Journal — Complete and Post

Relevant files:

- `pages/erp/gl/create-journal.page.ts`
- `tests/erp/gl/create-journal-complete-post.spec.ts`
- `types/erp/gl/create-journal-data.ts`
- `utils/erp/gl/load-create-journal-data.ts`

Purpose:

Create a unique manual journal, save and complete it, and submit it through Oracle's posting flow.

Test data and prerequisites:

- Uses the same `create-journal.json` model and loader as Save and Close.
- Lines must balance and be valid for the configured ledger, period, and category.
- The configured user must be authorized to create, complete, and submit the journal.

Workflow and validation:

1. Load the JSON and generate a unique batch name.
2. Sign in and navigate to Create Journal.
3. Enter the batch, header, attachment, and balanced lines.
4. Save and complete the journal.
5. Select Post and acknowledge Oracle's resulting posting or approval message.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/create-journal-complete-post.spec.ts --project=chromium --headed
```

Critical findings:

- Approval rules and amount thresholds determine whether posting is immediate or starts approval with posting requested.
- This test does not validate the approval Action Log; GL 4.4.1 covers that explicit approval-initiation evidence.

Status:

- Complete: journal creation, Save, Complete, and Post submission are implemented.
- Validation: passed using a creator with access to create, complete, and submit journals through the configured posting or approval flow.

### Withdraw and Delete Journals

Relevant files:

- `pages/erp/gl/journal-approvals.page.ts`
- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/withdraw-delete-journals.spec.ts`

Purpose:

Withdraw one explicitly named journal batch from approval and permanently delete it.

Test data and prerequisites:

- Prepare a unique journal that is pending approval and eligible for withdrawal and deletion.
- Runtime data: `<run-profile testDataPath>/gl/withdraw-delete-journals.json`
- Sanitized example: `test-data/examples/gl/withdraw-delete-journals.example.json`
- Set the JSON `journalBatchName` field to the exact intended batch.
- The journal must appear under Pending Approval from Others and show Approval Status `Required`.
- The configured batch is consumable test data: a successful run permanently deletes it, so the same JSON value cannot be reused unchanged.
- The run profile's `standardUser` must be authorized to withdraw the journal from approval and delete the resulting journal batch.

Workflow and validation:

1. Load and validate the exact batch name from the selected JSON file.
2. Navigate to Manage Approvals for Journals and open Pending Approval from Others.
3. Search for, select, and withdraw the exact batch.
4. Navigate to Manage Journals and open the withdrawn batch.
5. Delete it and accept Oracle's confirmation.
6. Search again and verify the exact batch is absent.
7. Remove or replace the deleted `journalBatchName` before a later execution.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/withdraw-delete-journals.spec.ts --project=chromium --headed
```

Critical findings:

- This operation is destructive and the deleted batch cannot be recovered through the test.
- Never reuse a stale batch name; verify the exact intended journal before enabling deletion.
- Anyone preparing `withdraw-delete-journals.json` must understand that the configured batch will always be deleted when the test reaches the deletion step. Use only test-environment or intentionally disposable journal data.

Status:

- Complete: JSON validation, withdrawal, deletion, and final absence validation are implemented.
- Validation: passed using a user authorized to withdraw journals from approval and delete the intended disposable batch.

### Validate Journal Details

Relevant files:

- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/validate-journal-details.spec.ts`
- `types/erp/gl/validate-journal-details-data.ts`
- `utils/erp/gl/load-validate-journal-details-data.ts`

Purpose:

Find one exact existing journal batch and validate its configured Batch Name, Balance Type, and Category.

Test data and prerequisites:

- Runtime data: `<run-profile testDataPath>/gl/validate-journal-details.json`
- Sanitized example: `test-data/examples/gl/validate-journal-details.example.json`
- Configure an exact existing batch name and its expected Balance Type and Category.
- The loader validates required values before browser actions; real journal data remains private.

Workflow and validation:

1. Load and validate the selected environment's JSON.
2. Sign in and navigate to Manage Journals.
3. Search for and open the exact batch.
4. Verify Batch Name, Balance Type, and Category.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/validate-journal-details.spec.ts --project=chromium --headed
```

Critical findings:

- Functional feedback intentionally limited this script to the three selected fields rather than every detail in the 4.1.5 Manage Journals guide.
- Oracle can render Balance Type either as an editable dropdown or as read-only text depending on journal state and environment. The validation supports both forms.

Status:

- Complete: exact search, JSON loading, and selected-detail validation are implemented.
- Validation: passed in multiple development environments.

### Create Interfund Journal and Submit (GL 4.3.1)

Relevant files:

- `config/run-profile.ts`
- `pages/erp/gl/create-journal.page.ts`
- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/create-interfund-journal-submit.spec.ts`
- `types/erp/gl/create-interfund-journal-data.ts`
- `utils/erp/gl/load-create-interfund-journal-data.ts`
- `test-data/examples/gl/create-interfund-journal.example.json`

Purpose:

Create and submit a two-fund journal, verify that Oracle assigns an approver, approve it in an isolated user session, confirm posting, and validate the two generated ledger intercompany balancing lines.

Test data and prerequisites:

- Runtime data: `<run-profile testDataPath>/gl/create-interfund-journal.json`
- Sanitized example: `test-data/examples/gl/create-interfund-journal.example.json`
- Configure exactly two original lines. Each line must have an eight-segment account, the declared Fund must match the account's first segment, the Funds must differ, and each line must contain either a debit or credit but not both.
- Total debits and credits must balance, and the configured attachment must exist.
- The run profile's `standardUser` must be able to create, complete, and submit journals for the configured ledger.
- The same run profile must define a separate `glApprover` user on the same Fusion URL. This user must have journal approval authority and access to the configured approver data access set.

Two-user execution model:

- This is one Playwright test containing two authenticated user sessions. It is not two test commands, and `RUN_PROFILE` does not change while the test is running.
- The normal Playwright `page` is the creator session. It signs in with `standardUser`, creates and submits the journal, and remains open while Oracle generates the approval assignment.
- After an `Assigned to` action appears, the test creates a second browser context with `browser.newContext()`. That context has independent cookies and session storage, so the approver cannot inherit or overwrite the creator's Fusion session.
- A new page in the isolated context signs in with `glApprover`, selects the approver data access set from the functional JSON, finds the exact generated batch, approves it, and performs the final posting and balancing-line validations.
- The test does not log the creator out, switch accounts in one page, or share authentication state between users. The approver context is closed in a `finally` block even when approval or validation fails.
- Both users come from the same private run-profile JSON and use its single `baseUrl`. A two-user profile has this shape:

```json
{
  "testDataPath": "test-data/clients/<client>/<environment>",
  "baseUrl": "<Fusion URL>",
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
}
```

- Save the real profile as `environments/run-profiles/<run-profile>.json`. Private run-profile JSON files are ignored by Git; never put real credentials in an `*.example.json` file.

Workflow and validation:

1. Load and validate the selected environment's JSON and generate a unique batch name.
2. Enter the batch and journal headers, commit the category, attach the supporting file, and enter the two original lines.
3. Save, complete, and submit the journal with posting requested.
4. Verify the Action Log contains `Sent for approval with posting`.
5. Leave the journal, reopen it through Manage Journals, and retry until the Action Log contains at least one `Assigned to` action.
6. Open a separate browser context, authenticate as the run profile's `glApprover`, select the configured data access set, and approve the exact batch.
7. Poll the exact batch-and-ledger result until Approval Status is `Approved` and Batch Status is `Posted`.
8. Reopen the journal and verify exactly two additional lines have Description `Ledger intercompany balancing line.`

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/create-interfund-journal-submit.spec.ts --project=chromium --headed
```

Critical findings:

- In the validated approval configuration, omitting the journal-level attachment caused Oracle Workflow to reject the journal automatically. The test attaches the file before entering journal lines.
- Approval assignment is asynchronous and can take several minutes. The test performs its first three checks at 30-second intervals, then checks at one-minute intervals for a bounded period while repeatedly returning through Manage Journals and reloading the exact batch.
- Automatic Playwright retries are disabled for this state-changing test because every retry would create and submit another real journal. A failed run must be reviewed before starting a new one.
- The approver uses a fresh browser context so creator and approver cookies and session storage remain isolated.
- The approver must select the data access set associated with the journal's ledger before searching for the batch.
- Approval can complete before posting does; final validation polls for both business states.
- The test selects the creator as `standardUser` and the approver as `glApprover` from the same run profile, keeping both sessions on the profile's single Fusion URL.
- If a run fails after submission, use the unique batch name printed in the console and stored in the `GL 4.3.1 journal handoff` attachment to inspect the existing journal before rerunning. A rerun creates a different journal; it does not resume the prior batch.

Status:

- Complete: end-to-end creation, submission, assignment, independent approval, posting, and balancing-line validation are implemented.
- Validation: passed using a creator with journal-submission access and a separate approver with approval authority and data-access-set access for the configured ledger.

### Initiate Journal Approval (GL 4.4.1)

Relevant files:

- `pages/common/fusion-navigator.page.ts`
- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/initiate-journal-approval.spec.ts`
- `types/erp/gl/journal-approval-data.ts`
- `utils/erp/gl/load-journal-approval-data.ts`
- `test-data/examples/gl/journal-approval.example.json`

Purpose:

Complete one exact saved journal, submit it into manual approval with posting requested, and verify Oracle recorded the durable approval action.

Test data and prerequisites:

- First create a unique balanced journal with `create-journal-save-close.spec.ts`.
- The amount must trigger manual approval. The validated journal used a USD 20,000 debit and credit; a lower amount was approved automatically in that environment.
- Set the exact saved batch name in `<run-profile testDataPath>/gl/journal-approval.json`.
- The journal must remain balanced, unposted, and eligible for Complete and Post.
- The creator must have a valid approval route. In the validated environment, the creator account required an authorized approver as its manager because the supervisory rule failed without a supervisor.

Workflow and validation:

1. Load and validate the exact saved batch from the shared journal-approval JSON.
2. Sign in as the creator and navigate to Manage Journals.
3. Search for and open the exact batch and verify its name.
4. Complete the journal and select Post.
5. Verify Oracle says approval is required and the journal was forwarded, then acknowledge it.
6. Open the batch Action Log and verify `Sent for approval with posting`.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/initiate-journal-approval.spec.ts --project=chromium --headed
```

Critical findings:

- Approval behavior depends on environment rules and journal amount.
- The validated environment uses a supervisory approval rule, meaning Oracle routes the request to the creator's configured manager. If that manager is missing or lacks approval authority, the journal cannot reach the approver used by GL 4.4.2.
- The Action Log is durable evidence; the transient confirmation alone is insufficient.
- This test stops after initiation. GL 4.4.2 performs approval and final Posted validation.
- See Multi-Script Manual Sequences for the complete create, initiate, approve, and AutoReverse sequence.

Status:

- Complete: completion, approval submission with posting requested, and Action Log validation are implemented.
- Validation: passed using a creator with the required journal-submission access and a valid approval route to an authorized approver.

### Approve Journal (GL 4.4.2)

Relevant files:

- `pages/common/fusion-navigator.page.ts`
- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/approve-journal.spec.ts`
- `types/erp/gl/journal-approval-data.ts`
- `utils/erp/gl/load-journal-approval-data.ts`
- `test-data/examples/gl/journal-approval.example.json`

Purpose:

Approve one exact journal as an independent authorized approver and verify asynchronous posting completes.

Test data and prerequisites:

- Run GL 4.4.1 first; the journal must be unposted, `In process`, assigned to the approver, and submitted with posting requested.
- The approver must differ from the creator.
- Runtime data: `<run-profile testDataPath>/gl/journal-approval.json`
- Put the exact pending batch name in the JSON `journalBatchName` field.
- The selected run profile must contain a `glApprover` user; this standalone test signs in directly as that named user.
- The approver needs Manage Journals access and approval authority for the target ledger. The validated user had a General Accounting Manager role scoped to that ledger.

Workflow and validation:

1. Load and validate the exact journal batch from the selected client's approval JSON before browser actions.
2. Sign in through the approver environment and navigate to Manage Journals.
3. Search for and open the exact batch and verify its name.
4. Select Approve and acknowledge the processing confirmation.
5. Select Cancel to return without undoing approval.
6. Poll the exact search until every current matching row is `Posted`.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/approve-journal.spec.ts --project=chromium --headed
```

Critical findings:

- Approval and posting are asynchronous; the confirmation is not final validation.
- Posting can create both a primary-ledger journal and a generated reporting-currency journal with the same batch name. The test waits until every exact-name row currently returned is `Posted`, preventing an unposted companion row from being overlooked.
- Temporary empty results are retried within the bounded polling timeout.

Status:

- Complete: exact approval, confirmation handling, return navigation, and final Posted polling are implemented.
- Validation: passed using the run profile's separate `glApprover` user with Manage Journals access and approval authority for the configured ledger.

### Run AutoPost Journals (GL 4.4.3)

Relevant files:

- `pages/common/fusion-navigator.page.ts`
- `pages/common/scheduled-processes.page.ts`
- `pages/erp/gl/auto-post-journals.page.ts`
- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/run-autopost-journals.spec.ts`
- `types/erp/gl/run-autopost-journals-data.ts`
- `utils/erp/gl/load-run-autopost-journals-data.ts`
- `test-data/examples/gl/run-autopost-journals.example.json`

Purpose:

Run AutoPost with the configured criteria set, validate its generated posting request, and confirm the intended journal reaches `Posted`.

Test data and prerequisites:

- Prepare a fresh complete, unposted journal that does not require approval.
- **Manual prerequisite — Playwright does not create or import this journal:** Use the ADFdi-enabled journal spreadsheet downloaded from Fusion as described in the Import Journals prerequisites. The required ADF Desktop Integrator Excel add-in/extension must already be installed.
- After completing the journal in the spreadsheet, click `Submit`. For `Option`, select `Submit Journal Import`; for `Descriptive`, select `Yes with validation`. This imports the journal but leaves it unposted for the AutoPost Playwright test.
- Do not select `Submit Journal Import and Posting`, because that would post the journal before the AutoPost test can exercise it.
- Runtime data: `<run-profile testDataPath>/gl/run-autopost-journals.json`
- JSON supplies the case-sensitive original spreadsheet journal base name, target primary ledger, and AutoPost criteria set.
- Configure an AutoPost criteria set that targets the intended primary ledger.
- Use a user whose Manage Journals results expose ledger information. The validated creator account worked; an approver-only account did not expose enough ledger information for final row selection.

Workflow and validation:

1. Find the prepared journal by base name and verify it is `Unposted`.
2. Navigate through Journals Tasks to Run AutoPost.
3. Select the criteria set, submit, and capture the AutoPost process ID.
4. In Scheduled Processes, validate that exact AutoPost request as `Succeeded`.
5. Download its log and extract the generated Post Journals process ID.
6. Validate that exact Post Journals request as `Succeeded`.
7. Return to Manage Journals and poll the configured ledger row until `Posted`.
8. Open the journal and verify the batch prefix, ledger, and Posted status.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/run-autopost-journals.spec.ts --project=chromium --headed
```

Critical findings:

- `AutoPost Journals` selects eligible journals but launches a separate `Post Journals` background request to perform posting. Oracle does not return that second ID in the submission dialog, so the test extracts it from the AutoPost Enterprise Scheduler Job Log.
- The generated `Post Journals` request may finish with `Warning` when the criteria set also selects unrelated invalid journals. The test accepts `Succeeded` or `Warning` for this subprocess only, then independently requires the configured journal and ledger row to reach `Posted`. A warning does not bypass target-journal validation.
- Scheduled Processes can briefly render stale results and can collapse its Search panel during refresh. The page object uses exact IDs and bounded state-based retries.
- Manage Journals can return primary- and reporting-ledger rows for one batch; final validation is scoped to the configured ledger.

Status:

- Complete: parent/child process validation, process-ID evidence, ledger-scoped polling, and final journal validation are implemented.
- Validation: passed using a user with access to run the configured AutoPost criteria set, inspect Scheduled Processes, and view the target ledger in Manage Journals.

### Manually Post Journal (GL 4.4.4)

Relevant files:

- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/manually-post-journal.spec.ts`
- `types/erp/gl/manually-post-journal-data.ts`
- `utils/erp/gl/load-manually-post-journal-data.ts`
- `test-data/examples/gl/manually-post-journal.example.json`

Purpose:

Submit one exact prepared journal batch through Post Batch and verify it entered approval with posting requested.

Test data and prerequisites:

- Prepare an exact saved journal for which the configured user can select Post Batch.
- Runtime data: `<run-profile testDataPath>/gl/manually-post-journal.json`
- Set the JSON `journalBatchName` field to that exact batch.
- Oracle must route it into approval and display `Your journal approval request has been submitted.`
- The test requires exactly one result row; ambiguous exact matches stop execution.
- The run profile's `standardUser` must be authorized to select Post Batch and have a valid approval route to an authorized approver.

Workflow and validation:

1. Load and validate the exact batch from the manual-posting JSON before browser actions.
2. Search Manage Journals for the exact batch and require one result.
3. Select the row through its blank selector cell and verify selection.
4. Select Post Batch and acknowledge the approval-request confirmation.
5. Search the exact batch again and open its Journal link.
6. Verify the batch name and Action Log entry `Sent for approval with posting`.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/manually-post-journal.spec.ts --project=chromium --headed
```

Critical findings:

- This test proves approval initiation with posting requested; it does not prove final Batch Status `Posted`.
- GL 4.4.2 performs final approval and Posted polling.
- Selecting the blank row cell avoids opening a Journal or Journal Batch link accidentally.

Status:

- Complete: safe exact-row selection, Post Batch submission, confirmation, and durable Action Log validation are implemented.
- Validation: passed using a user with Post Batch access and a valid approval route to an authorized approver.

### Inquire on Detail Balances (GL 4.4.5)

Relevant files:

- `pages/common/fusion-navigator.page.ts`
- `pages/erp/gl/inquire-on-detail-balances.page.ts`
- `pages/erp/gl/journal-lines.page.ts`
- `pages/erp/gl/subledger-journal-lines.page.ts`
- `tests/erp/gl/inquire-on-detail-balances.spec.ts`
- `types/erp/gl/inquire-on-detail-balances-data.ts`
- `utils/erp/gl/load-inquire-on-detail-balances-data.ts`
- `test-data/examples/gl/inquire-on-detail-balances.example.json`

Purpose:

Search detail balances, open a non-zero Period Activity result, and verify navigation through Journal Lines, Subledger Journal Lines, Journal Entry, and Transaction.

Test data and prerequisites:

- Runtime data: `<run-profile testDataPath>/gl/inquire-on-detail-balances.json`
- Configure the target ledger, periods, currency, scenario, and client-specific segments.
- The search must return at least one non-zero Period Activity.
- Fusion defaults are retained; JSON fills only empty controls.

Workflow and validation:

1. Search using the configured criteria.
2. Open the first Period Activity when non-zero.
3. If zero, use Advanced Sort across all results: ascending first, then descending if needed, and open the first non-zero value after refresh.
4. Select Debit for positive activity or Credit for negative activity.
5. Verify Subledger Journal Lines.
6. Open and return from View Journal Entry and View Transaction.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/inquire-on-detail-balances.spec.ts --project=chromium --headed
```

Critical findings:

- Do not hard-code an account, row, or amount.
- Oracle virtualizes results; sorting must cover the server-side result set.
- Wait for the old first-row link to detach before evaluating refreshed data.
- Some environment data caused Period Activity links to display an Oracle error instead of opening Journal Lines. The same navigation succeeded with valid data in another environment, so the test avoids encoding an account-specific workaround.
- The 180-second timeout accommodates login retry and sorting refresh.

Status:

- Complete: JSON search, conditional sorting, sign-based drill-down, and navigation smoke checks are implemented.
- Validation: passed with working Period Activity data on August 13, 2026.

### Set Up and Reverse a Journal (GL-08)

Relevant files:

- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/reverse-journal.spec.ts`
- `types/erp/gl/journal-reversal-data.ts`
- `utils/erp/gl/load-journal-reversal-data.ts`
- `test-data/examples/gl/journal-reversal.example.json`

Purpose:

Configure an existing reversible journal, create its next-period reversal, locate the generated reversal batch, and submit that batch through Post Batch.

Test data and prerequisites:

- Runtime data: `<run-profile testDataPath>/gl/journal-reversal.json`
- Sanitized example: `test-data/examples/gl/journal-reversal.example.json`
- JSON supplies the exact source journal batch, primary ledger, tester-selected reversal period, and reversal method.
- The source journal must already be approved, posted, and reversible in Oracle Fusion.
- The journal name must contain Oracle's stable `Manual <ID>` value, which is used to find the generated reversal.
- Source journals are consumable test data. After a successful reversal, replace `sourceJournalBatchName` with another eligible journal before rerunning the test.
- The reversal period is normally the period after the source accounting period, but the tester controls the exact valid value through JSON.
- The run profile's `standardUser` must be authorized to update reversal information, submit the reversal, and select Post Batch for the generated journal.

Workflow and validation:

1. Load and validate the selected environment's JSON.
2. Sign in and find the exact source batch on the configured primary ledger.
3. Stop clearly if the journal is not posted, approved, and reversible.
4. Extract the numeric ID from the source journal name.
5. Open the journal, set the configured Reversal Period and Reversal Method, save, and verify both values.
6. Select Reverse, capture the submitted process ID, and return to Manage Journals.
7. Poll Manage Journals using Journal Batch `Contains <source journal ID>`, the reversal accounting period, and Batch Status `Unposted` until the generated primary-ledger reversal is available.
8. Verify the generated batch is tied to the captured process ID and has the expected period, ledger, approval requirement, and unposted reversal state.
9. Select that exact row, choose Post Batch, verify the `Confirmation` dialog heading, and acknowledge it.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/reverse-journal.spec.ts --project=chromium --headed
```

Critical findings:

- Reversal creation is asynchronous. An empty first search does not indicate failure; the test retries within a bounded timeout.
- Oracle prefixes generated names with `Reverses`, so an exact or Starts With search for the original batch does not work. The numeric source journal ID and Journal Batch `Contains` operator provide the stable lookup.
- Primary- and reporting-ledger rows can share the source ID. The test acts only on the configured ledger.
- The reversal confirmation process ID is included in Oracle's generated batch name and is captured in Playwright evidence for debugging.
- Post Batch behavior varies by environment: it can post immediately or initiate approval. GL-08 verifies only that Oracle displays a `Confirmation` dialog after submission; approval and final posting are outside this test's scope.

Status:

- Complete: reversal configuration, submission, asynchronous discovery, exact primary-ledger selection, and Post Batch confirmation are implemented.
- Validation: passed using a user authorized to configure and submit journal reversals and to submit the generated reversal through Post Batch.

### Run AutoReverse Journal (GL 4.1.6)

Relevant files:

- `pages/common/fusion-navigator.page.ts`
- `pages/erp/gl/auto-reverse-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `pages/erp/gl/manage-journals.page.ts`
- `tests/erp/gl/run-autoreverse-journal.spec.ts`
- `types/erp/gl/run-autoreverse-journal-data.ts`
- `utils/erp/gl/load-run-autoreverse-journal-data.ts`
- `test-data/examples/gl/run-autoreverse-journal.example.json`

Purpose:

Submit AutoReverse for one exact eligible journal and validate its resulting business state.

Test data and prerequisites:

- Runtime data: `<run-profile testDataPath>/gl/run-autoreverse-journal.json`
- JSON supplies the exact batch, ledger, data access set, reversal period, category, and reversal method.
- The journal must be approved and posted, use Category `Accrual`, show `Reversible`, and contain valid reversal information.
- The run profile's `standardUser` must have access to the configured data access set and authority to submit Run AutoReverse.

Workflow and validation:

1. Select the exact primary-ledger batch and validate its initial state and reversal settings.
2. Submit Run AutoReverse and capture its process ID.
3. Poll until the exact primary-ledger row shows `Not Reversible - Journal is already reversed`.
4. Open the journal, verify Reversal Status `Reversed`, and Save and Close.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/run-autoreverse-journal.spec.ts --project=chromium --headed
```

Critical findings:

- AutoReverse can complete its background request before every journal row visibly refreshes. The test therefore treats the journal's final `Reversed` business state as the pass condition and records the process ID only for troubleshooting.
- Primary- and reporting-ledger rows can share a batch name, so selection is ledger-scoped.

Status:

- Complete: eligibility, submission, process-ID evidence, and final reversal validation are implemented.
- Validation: passed using a user with access to the configured data access set and authority to submit Run AutoReverse.

### Import Journals from Subledger (GL 4.1.3)

Relevant files:

- `pages/common/fusion-navigator.page.ts`
- `pages/common/scheduled-processes.page.ts`
- `pages/erp/gl/import-journals.page.ts`
- `pages/erp/gl/manage-journals.page.ts`
- `pages/erp/gl/edit-journal.page.ts`
- `tests/erp/gl/import-journals-from-subledger.spec.ts`
- `types/erp/gl/import-journals-data.ts`
- `utils/erp/gl/load-import-journals-data.ts`
- `test-data/examples/gl/import-journals.example.json`

Purpose:

Import staged journal data, validate its parent and child processes, locate the created journal, post it, and confirm its final business state.

Test data and prerequisites:

- Runtime data: `<run-profile testDataPath>/gl/import-journals.json`
- JSON supplies Source and Ledger; remaining parameters retain Oracle defaults.
- **Manual prerequisite — Playwright does not perform this upload:** Before running the script, the person running it must manually download, complete, and submit the Oracle journal spreadsheet. The Playwright script starts only after journal rows have been staged in Oracle's interface table.
- To download the spreadsheet from the target Fusion environment, navigate to **General Accounting > Manage Journals**, click **Done**, open the **Tasks** menu, and under **Journals** select **Create Journal in Spreadsheet**.
- The workstation must have the Oracle ADF Desktop Integration (ADFdi) Excel add-in/extension. In Fusion, open **Navigator > Tools > Download ADF Desktop Integrator**. Open the downloaded installer and follow its prompts to install the add-in. When installation is complete, open Microsoft Excel and sign in using your Fusion credentials before using the journal workbook.
- Open the downloaded workbook in Microsoft Excel and enter a unique batch name, balanced valid accounts, an eligible accounting period, and the other required journal values for the same Fusion environment.
- In the spreadsheet, set the `Submission` field to `Save to Interface`, then click `Submit`. This manually stages the spreadsheet rows for the Playwright test without importing them.
- Do not select `Submit Journal Import` or `Submit Journal Import and Posting`. Those options would perform work that the Playwright test is responsible for performing after it starts.
- With Group ID left at `All Group IDs`, Oracle attempts every eligible staged group for the selected Source and Ledger, including rows uploaded by earlier tests or other users. Invalid stale rows can therefore turn an otherwise valid run into Warning.
- This flow requires Approval Status `Not required`. Its Post action expects Oracle to submit a posting process immediately; it does not sign in as a separate approver.
- The run profile's `standardUser` must be authorized to run Import Journals, inspect Scheduled Processes, and post the resulting journal.

Workflow and validation:

1. Sign in and navigate to General Accounting > Journals > Tasks > Import Journals.
2. Enter the configured Source and Ledger, retain the remaining Oracle defaults, and submit.
3. Capture the parent process ID and validate that exact Import Journals request in Scheduled Processes.
4. Download the parent log, extract the child ID, and validate the exact child and parent relationship.
5. Download the child's Journal Import Execution Report and extract the batch-name prefix.
6. Return to Manage Journals, search by the prefix and configured ledger, and open the one matching Journal link.
7. Verify the imported journal's Source, approval, funds, batch, and completion states.
8. Post it, capture the posting process ID, acknowledge the confirmation, and return with Cancel.
9. Poll the same Manage Journals row until it is `Posted` with `Not Reversible - Reversal information is not available`.

Run command:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/import-journals-from-subledger.spec.ts --project=chromium --headed
```

Critical findings:

- The submitted `Import Journals` request is a parent launcher. Its log contains the exact `Import Journals: Child` process ID, so the test follows that relationship instead of selecting the newest Scheduled Processes row.
- The child performs the actual import and owns the Journal Import Execution Report. This scenario expects that report to list exactly one created batch.
- Oracle extends the spreadsheet-entered batch name with values such as Source `Spreadsheet`, balance type, Group ID, and the child process ID. The execution report can truncate this generated suffix, so the test retains the original portion before `Spreadsheet` and uses it as the Manage Journals search prefix.
- Journal Import error `EF04` means a staged account combination is invalid, typically because a segment value does not exist or violates account-validation rules. The child finishes with Warning and that status propagates to the parent. Use the report or Correct Import Errors to identify the affected Group ID, then correct the rows or run Delete Journal Import Data for that exact Source and Group ID. This cleanup removes staged interface data, not an already-created journal; never perform a broad deletion across unrelated groups.
- Approval can vary by amount and environment. The validated flow assumes auto-approval; add a separate path if functional testing requires it.

Status:

- Complete: import, process validation, report parsing, journal lookup, posting, and final-state validation are implemented.
- Validation: passed using a user authorized to run Import Journals, inspect its parent and child scheduled processes, and post the imported journal.

## GL Script Prerequisites

These requirements describe each script's standalone prerequisites. Multi-script workflows currently transfer generated journal identifiers manually.

| Script | Existing journal required? | Local data or environment values | Required journal state |
| --- | --- | --- | --- |
| `create-journal-save-close.spec.ts` | No | `create-journal.json` and attachment | Not applicable; the script creates a unique journal and saves it. |
| `create-journal-complete-post.spec.ts` | No | `create-journal.json` and attachment | Not applicable; the script creates, completes, and selects Post. Approval rules can determine whether posting is immediate. |
| `create-interfund-journal-submit.spec.ts` | No | `create-interfund-journal.json`, attachment, and run-profile users `standardUser` and `glApprover` | Two balanced original lines use different Funds; the creator can submit; the journal routes to an authorized approver with access to the target ledger's data access set. |
| `initiate-journal-approval.spec.ts` | Yes | `journal-approval.json` | Exact saved batch is balanced, can be completed, and its amount and approval route cause manual approval. |
| `approve-journal.spec.ts` | Yes | `journal-approval.json`; run-profile user `glApprover` | Exact batch is unposted, `In process`, and assigned to the approver. |
| `manually-post-journal.spec.ts` | Yes | `manually-post-journal.json` | Exact saved batch appears as one unambiguous search result, `Post Batch` is enabled, and the configured user can submit it into approval with posting requested. |
| `run-autopost-journals.spec.ts` | Yes | `run-autopost-journals.json` | Target journal is complete, unposted, does not require approval, and matches the configured ledger and criteria set. |
| `inquire-on-detail-balances.spec.ts` | No journal batch | `inquire-on-detail-balances.json` | Configured balance search returns at least one non-zero Period Activity that supports the required drill-down. |
| `reverse-journal.spec.ts` | Yes | `journal-reversal.json` containing consumable source data | Exact primary-ledger journal is approved, posted, and reversible. Replace the source batch after a successful reversal. |
| `run-autoreverse-journal.spec.ts` | Yes | `run-autoreverse-journal.json` | Exact primary-ledger batch is Accrual, approved, posted, and reversible. |
| `import-journals-from-subledger.spec.ts` | No existing journal; staged interface data required | `import-journals.json` plus an ADFdi `Save to Interface` upload | Staged rows are valid, uniquely identifiable, and eligible for import and immediate posting without approval. |
| `validate-journal-details.spec.ts` | Yes | `validate-journal-details.json` | Exact batch exists and its Balance Type and Category match the expected JSON values. |
| `withdraw-delete-journals.spec.ts` | Yes | `withdraw-delete-journals.json` containing consumable test data | Exact batch is unposted, available under Pending Approval from Others, can be withdrawn, and is eligible for permanent deletion. Replace the batch name after a successful run. |

## Environment-Variable Inputs

All migrated GL scripts use one selector:

```env
RUN_PROFILE=<run-profile filename without .json>
```

`RUN_PROFILE=demo-dev`, for example, selects `environments/run-profiles/demo-dev.json`. A run profile contains the functional-data directory, one Fusion URL, and its named users:

```json
{
  "testDataPath": "test-data/clients/<client>/<environment>",
  "baseUrl": "<Fusion URL>",
  "users": {
    "standardUser": {
      "username": "<username>",
      "password": "<password>"
    }
  }
}
```

Tests that approve journals also require `users.glApprover`. The test chooses its required named user; the person running it does not pass a separate user selector. Real run-profile files are ignored by Git.

Backward compatibility remains available for scripts that have not migrated to run profiles. Those older scripts may still use `CLIENT_ALIAS`, `TEST_DATA_ALIAS`, and `ENVIRONMENT` with `environments/.env.<client-alias>.<environment>`. Do not combine those legacy selectors with the GL commands in this document.

## Multi-Script Manual Sequences

### Manually Submit an Existing Journal for Posting (GL 4.4.4)

1. Prepare a saved journal that the configured user is authorized to submit through Manage Journals.
2. Confirm that an exact-name search returns one row for the batch; the test intentionally rejects ambiguous duplicate rows.
3. Set the exact batch name in `manually-post-journal.json`:

```text
"journalBatchName": "<exact saved journal batch name>"
```

4. Run the manual-posting test:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/manually-post-journal.spec.ts --project=chromium --headed
```

5. Confirm that the test observes Oracle's approval-request confirmation and validates `Sent for approval with posting` in the journal Action Log.
6. If final approval is required, run the separate approval test with the authorized approver and the same exact batch name.

### Create, Initiate Approval, Approve, and AutoReverse

These tests are intentionally independent and are run manually one at a time. They do not automatically pass the generated journal batch name to the next test.

1. Configure the selected environment's `create-journal.json` with balanced Accrual journal data that requires manual approval and uses configured reversal criteria.
2. Create and save the journal:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/create-journal-save-close.spec.ts --project=chromium --headed
```

3. Copy the exact generated journal batch name into the selected client's `journal-approval.json`.
4. Complete the journal, select Post, and validate that it was sent for approval with posting:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/initiate-journal-approval.spec.ts --project=chromium --headed
```

5. Keep the same exact batch in the run profile's `journal-approval.json`; the approval test reads `glApprover` from the same run profile.
6. Approve the journal with the authorized approver:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/approve-journal.spec.ts --project=chromium --headed
```

7. Confirm `run-autoreverse-journal.json` contains values matching the approved journal:

```text
"journalBatchName": "<same exact journal batch name>",
"ledger": "<primary ledger>",
"dataAccessSet": "<data access set>",
"reversalPeriod": "<configured reversal period>"
```

8. Run AutoReverse and validate the completed reversal:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/run-autoreverse-journal.spec.ts --project=chromium --headed
```

9. For failure diagnostics, open the Playwright report. The AutoReverse test logs and attaches the submitted process ID so the matching scheduled process can be inspected in Oracle Fusion:

```powershell
npx playwright show-report
```

### Withdraw and Delete

These are independent tests that are run manually in sequence. The Create Journal test generates a unique batch name, but it does not automatically pass that value to the Withdraw and Delete test. The batch name must be transferred manually through the selected JSON file.

1. Before creating the journal, confirm that `<run-profile testDataPath>/gl/create-journal.json` contains safe, balanced test data.
2. The configured journal must be eligible for the environment's approval workflow so that it will be available under Pending Approval from Others.
3. Create the journal, complete it, and select Post:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/create-journal-complete-post.spec.ts --project=chromium --headed
```

4. Confirm that the Create Journal test passes.
5. Manually locate the newly generated journal batch name in Oracle Fusion or in the Playwright test evidence. Do not reuse the name of an older journal.
6. Confirm that this exact journal is pending approval, safe to delete, and visible under Manage Approvals for Journals > Pending Approval from Others.
7. Open `<run-profile testDataPath>/gl/withdraw-delete-journals.json` and set the exact generated batch name:

```text
"journalBatchName": "<exact generated journal batch name>"
```

8. Carefully verify the complete `journalBatchName` value before continuing. The withdrawal test permanently deletes the selected journal batch.
9. Run the Withdraw and Delete test using the same run profile that created the journal:

```powershell
$env:RUN_PROFILE="<run-profile>"
npx playwright test tests/erp/gl/withdraw-delete-journals.spec.ts --project=chromium --headed
```

10. The test performs the following validations and actions:
    - Stops before opening the browser unless an exact batch name is configured.
    - Opens Manage Approvals for Journals.
    - Selects Pending Approval from Others.
    - Searches for and selects the exact journal batch.
    - Withdraws the selected journal from approval.
    - Returns to Manage Journals.
    - Searches for and opens the withdrawn journal batch.
    - Deletes the journal batch and accepts Oracle's confirmation.
    - Searches again and verifies that the exact batch no longer exists.
11. Confirm that the Playwright test passes and that the intended journal is no longer returned by Manage Journals.
12. If troubleshooting is needed, open the latest Playwright report:

```powershell
npx playwright show-report
```

13. Remove or replace the deleted `journalBatchName` so a later test cannot accidentally target stale data.

When testing another client or environment, select the corresponding run profile and verify that its private JSON points to the intended Fusion URL, functional-data directory, and users. The GL test command itself should need only `RUN_PROFILE` to change.

## GL Navigation

General Ledger navigation uses the expanded General Accounting quick actions:

```text
Home
  → General Accounting
  → Show More
  → requested quick action
```

Destinations:

- Create Journal
- Manage Journals
- Manage Approvals for Journals
- Run AutoReverse from the Journals Tasks panel

Each navigation method waits for the expanded actions, selects the requested action, and verifies the destination page.

## Known Oracle UI Behaviors

- The Oracle Home button may be required after authentication.
- Initial General Accounting tiles can differ between users or environments.
- Selecting `Show More` exposes the consistent General Accounting quick actions used by shared navigation.
- ADF grid filters are applied by pressing Enter.
- Selecting a journal row must avoid clicking its navigation link.
- The Manage Journals search panel collapses after deletion.
- Accounting-period formats vary between environments.
- Oracle may show both a primary-ledger row and a reporting-currency row for one exact batch. Before reversal, the reporting row can show `Not Reversible - Reporting currency journal`, while the primary row shows `Reversible`.
- After reversal, the primary row shows `Not Reversible - Journal is already reversed`.
- AutoReverse can create a separate `Post Journals` scheduled process to post the generated reversal journal.
- The generated process ID is retained in the Playwright report for failure diagnostics.
- When finishing the final journal-line edit during creation, pressing Tab commits the grid value before Save and Close is selected.
