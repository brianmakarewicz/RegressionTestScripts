import path from "node:path";
import { test } from "@playwright/test";
import { requireRunProfile } from "../../../config/run-profile";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { PayInvoicesPage } from "../../../pages/erp/ap/pay-invoices.page";
import { PaymentProcessStatusPage } from "../../../pages/erp/ap/payment-process-status.page";
import { loadPayInvoicesData } from "../../../utils/erp/ap/load-pay-invoices-data";

const PREFIX = requiredEnv('PREFIX');
// Submission/resume have business side effects. Do not repeat automatically on failure.
test.describe("AP-08 Submit Payment Request", () => {
  test.describe.configure({ retries: 0 });

  test("submit, review, and resume a payment request and verify processes", async ({ page }, testInfo) => {
    // Setup: load the run profile and JSON inputs, then name this payment request.
    test.setTimeout(30 * 60 * 1_000);
    const profile = requireRunProfile();
    const data = loadPayInvoicesData(path.join(profile.testDataPath, "ap", "pay-invoices.json"));
    const requestName = `${PREFIX}${data.paymentName}`;
    
    // Authentication: initialize the page objects and sign in as the profile user.
    const navigator = new FusionNavigatorPage(page);
    const payments = new PayInvoicesPage(page);
    const processes = new PaymentProcessStatusPage(page);
    await testInfo.attach("Payment process request", { body: requestName, contentType: "text/plain" });
    await new AuthenticationWorkflow(page, profile.user("standardUser")).login();

    // Process tracking: capture existing IDs and verify new jobs for this request.
    const snapshot = async () => {
      await navigator.goToScheduledProcessesPage();
      await processes.searchBySubmittedBy(profile.user("standardUser").username);
      return processes.snapshot();
    };
    const verifyProcesses = async (names: string[], before: Set<string>) => {
      await navigator.goToScheduledProcessesPage();
      await processes.searchBySubmittedBy(profile.user("standardUser").username);
      const ids = await processes.waitForStage(requestName, names, before);
      await testInfo.attach(names.join(", "), { body: JSON.stringify({ requestName, ids }), contentType: "application/json" });
    };
    // Capture existing processes before submitting this payment request.
    const beforeSubmit = await snapshot();
    await test.step("Submit PPR and verify scheduled processes", async () => {
      await navigator.goToSubmitPaymentProcessRequestPage();
      await payments.submitRequest(requestName, data);
      await verifyProcesses(["Initiate Payment Process Request", "Payables Selected Installments Report", "Build Payments"], beforeSubmit);
    });
    // Review installments for this request, then verify the newly submitted processes.
    // Capture the next baseline on the current Scheduled Processes page.
    const beforeInstallments = await processes.snapshot();
    await navigator.goToPaymentsPage();
    await test.step("Review installments and verify scheduled processes", async () => {
      await payments.reviewInstallments(requestName);
      await verifyProcesses([
        "Initiate Payment Process Request: Recalculate Payment Process Request",
        "Payables Selected Installments Report",
        "Build Payments",
        "Payment Process Request Status Report",
      ], beforeInstallments);
    });
    // Review proposed payments, resume this request, and verify the build and status-report jobs.
    // Capture the next baseline on the current Scheduled Processes page.
    const beforeResume = await processes.snapshot();
    await navigator.goToPaymentsPage();
    await test.step("Review proposed payments, resume, and verify scheduled processes", async () => {
      await payments.reviewProposedPaymentsAndResume(requestName);
      await verifyProcesses(["Build Payments", "Payment Process Request Status Report"], beforeResume);
    });
    // Return to Payments and leave it visible for five seconds.
    await navigator.goToPaymentsPage();
    await page.waitForTimeout(5_000);
  });
});

/* ============================================================
 * HELPERS
 * ============================================================
 */

// Read a required environment variable and report missing or blank input.
function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Required environment variable ${name} was not provided.`);
  }

  return value;
}
