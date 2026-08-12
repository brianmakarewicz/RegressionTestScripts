import path from "node:path";
import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { InquireOnDetailBalancesPage } from "../../../pages/erp/gl/inquire-on-detail-balances.page";
import { loadInquireOnDetailBalancesData } from "../../../utils/test-data/load-inquire-on-detail-balances-data";

test("user can search detail balances", async ({ page }) => {
  test.setTimeout(90_000);

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

  await authentication.login();
  await navigatorPage.goToInquireOnDetailBalancesPage();
  await detailBalancesPage.search(criteria);
});
