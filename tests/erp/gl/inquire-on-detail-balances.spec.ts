import path from "node:path";
import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { InquireOnDetailBalancesPage } from "../../../pages/erp/gl/inquire-on-detail-balances.page";
import { JournalLinesPage } from "../../../pages/erp/gl/journal-lines.page";
import { SubledgerJournalLinesPage } from "../../../pages/erp/gl/subledger-journal-lines.page";
import { loadInquireOnDetailBalancesData } from "../../../utils/erp/gl/load-inquire-on-detail-balances-data";

test("user can search detail balances", async ({ page }) => {
  test.setTimeout(180_000);

  const dataFilePath = path.join(
    "test-data",
    "clients",
    env.clientAlias,
    env.environment,
    "gl",
    "inquire-on-detail-balances.json",
  );
  const criteria = loadInquireOnDetailBalancesData(dataFilePath);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const detailBalancesPage = new InquireOnDetailBalancesPage(page);
  const journalLinesPage = new JournalLinesPage(page);
  const subledgerJournalLinesPage = new SubledgerJournalLinesPage(page);

  await authentication.login();
  await navigatorPage.goToInquireOnDetailBalancesPage();
  await detailBalancesPage.search(criteria);
  const journalLineSide =
    await detailBalancesPage.openNonZeroPeriodActivity();
  await journalLinesPage.expectLoaded();
  await journalLinesPage.openAmountForActivity(journalLineSide);
  await subledgerJournalLinesPage.expectLoaded();
  await subledgerJournalLinesPage.openJournalEntryAndReturn();
  await subledgerJournalLinesPage.openTransactionAndReturn();
});
