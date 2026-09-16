const { spawnSync } = require("node:child_process");
const path = require("node:path");

// Run from the repository root, regardless of the caller's current directory.
const root = path.resolve(__dirname, "../../..");
const dryRun = process.argv.includes("--dry-run");
const baseEnv = { ...process.env };
delete baseEnv.SUFFIX;

function run(label: string, command: string, args: string[], env: NodeJS.ProcessEnv): string {
  console.log(`\n${label}`);
  if (dryRun) {
    console.log([command, ...args].join(" "));
    console.log(`SUFFIX=${env.SUFFIX ?? "<unset>"}`);
    return '';
  }
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status}, signal ${result.signal}).`);
  return result.stdout ?? '';
}

// Invoke the installed Playwright CLI directly, equivalent to npx playwright test.
function playwright(file: string, suffix?: string): void {
  const env = { ...baseEnv };
  if (suffix) env.SUFFIX = suffix;
  run(file, process.execPath, [
    path.join(root, "node_modules/@playwright/test/cli.js"),
    "test", `tests/erp/ap/${file}\\.spec\\.ts$`, "--headed", "--project=chromium",
  ], env);
}

function createAndValidate(suffix?: string): void {
  const env = { ...baseEnv };
  if (suffix) env.SUFFIX = suffix;
  const output = run(`Create invoice (suffix: ${suffix ?? "none"})`, "py", ["tests/erp/ap/create-invoice.py"], env);
  // Python may exit zero on an API failure; require its success message before continuing.
  if (!dryRun && !/^Created invoice .+$/m.test(output)) {
    throw new Error("Invoice creation did not report success; stopping.");
  }
  playwright("validate-approve-invoice", suffix);
}

try {
  if (!dryRun && (!baseEnv.RUN_PROFILE?.trim() || !baseEnv.PREFIX?.trim())) {
    throw new Error("Set RUN_PROFILE and PREFIX before running this script.");
  }
  // 1-3: create and approve the unsuffixed invoice, then create its manual payment.
  createAndValidate();
  playwright("create-manual-payment");
  // Repeat 1-2 with _2 for creation and validation, then run the payment request flow.
  createAndValidate("_2");
  playwright("pay-invoices");
  // 5-7: create the PO invoice, receive the PO/revalidate, then approve and post.
  playwright("create-po-match-invoice");
  playwright("po-match-invoice-holds");
  playwright("po-match-invoice-valid-post");
  console.log(dryRun ? "\nDry run complete; no commands executed." : "\nAP sequence completed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
