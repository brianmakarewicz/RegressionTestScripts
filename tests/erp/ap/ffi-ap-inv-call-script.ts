const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("csv-parse/sync");

const root = path.resolve(__dirname, "../../..");
const dryRun = process.argv.includes("--dry-run");
const baseEnv = { ...process.env };
delete baseEnv.SUFFIX;
const quote = (value: string): string => "'" + value.replace(/'/g, "''") + "'";
const groups = [
  { name: "Create-Inv-Manual-Payment", suffix: "", files: ["create-invoice.py", "validate-approve-invoice", "create-manual-payment"] },
  { name: "Create-Inv-Payment-Process", suffix: "_2", files: ["create-invoice.py", "validate-approve-invoice", "pay-invoices"] },
  { name: "Create-PO-Match-Invoice", suffix: "", files: ["create-po-match-invoice", "po-match-invoice-holds", "po-match-invoice-valid-post"] },
];

function main(): void {
  const selection = process.env.SUBPROCESS?.trim();
  if (selection && !groups.some((group) => group.name === selection)) {
    throw new Error(`Invalid SUBPROCESS. Valid names: ${groups.map((group) => group.name).join(", ")}`);
  }
  const profile = baseEnv.RUN_PROFILE?.trim().toLowerCase();
  const prefix = baseEnv.PREFIX?.trim();
  if (!profile || !/^[a-z0-9_-]+$/.test(profile) || !prefix) {
    throw new Error("Set a valid RUN_PROFILE and a nonempty PREFIX before running.");
  }
  const profileData = JSON.parse(fs.readFileSync(path.join(root, "environments/run-profiles", `${profile}.json`), "utf8"));
  const dataFolder = path.resolve(root, profileData.testDataPath, "ap");
  const relativeData = path.relative(path.join(root, "test-data"), dataFolder);
  if (relativeData.startsWith("..") || path.isAbsolute(relativeData)) throw new Error("Profile testDataPath must be inside test-data.");
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  const runId = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const output = path.join(root, "output", relativeData, runId);
  const reportPath = path.join(output, "summary.txt");
  const report = ["FFI AP procedure report", `Started: ${new Date().toISOString()}`, `Profile: ${profile}`, `PREFIX: ${prefix}`, `SUBPROCESS: ${selection || "ALL"}`, ""];
  let failed = false;
  if (!dryRun) fs.mkdirSync(output, { recursive: true });
  const save = () => { if (!dryRun) fs.writeFileSync(reportPath, report.join("\n") + "\n", "utf8"); };
  const setup = [`Set-Location ${quote(root)}`, `$env:RUN_PROFILE=${quote(profile)}`, `$env:PREFIX=${quote(prefix)}`];

  for (const group of groups.filter((group) => !selection || group.name === selection)) {
    report.push(`SUBPROCESS: ${group.name}`);
    let blocked = false;
    let invoice = "Unavailable";
    let paymentRequest = "";
    const suffixSetting = `$env:SUFFIX=${group.suffix ? quote(group.suffix) : "$null"}`;
    const commands = group.files.map((file) =>
      file === "create-invoice.py"
        ? "py .\\tests\\erp\\ap\\create-invoice.py"
        : `npx playwright test ${quote(`tests/erp/ap/${file}\\.spec\\.ts$`)} --headed --project=chromium --workers=1 --retries=0`,
    );
    if (dryRun) console.log([...setup, suffixSetting].join("\n"));
    // Input lookup is isolated per subprocess so a bad non-PO input cannot block PO tests.
    try {
      if (group.name === "Create-PO-Match-Invoice") {
        const data = JSON.parse(fs.readFileSync(path.join(dataFolder, "po_match_inv.json"), "utf8"));
        if (!data.invNumber?.trim()) throw new Error("po_match_inv.json is missing invNumber.");
        invoice = prefix + data.invNumber;
      } else {
        const files = fs.readdirSync(dataFolder, { withFileTypes: true }).filter((entry: any) => entry.isFile() && /^ap_inv.*\.csv$/i.test(entry.name));
        if (files.length !== 1) throw new Error(`Expected one ap_inv*.csv; found ${files.length}.`);
        const rows = parse(fs.readFileSync(path.join(dataFolder, files[0].name), "utf8"), { columns: true, bom: true, skip_empty_lines: true });
        if (!rows[0]?.NUMBER?.trim()) throw new Error("First CSV row is missing NUMBER.");
        invoice = prefix + rows[0].NUMBER + group.suffix;
      }
    } catch (error) {
      report.push(`FAILED: subprocess input preparation: ${String(error)}`);
      blocked = true;
      failed = true;
    }
    report.push(`Invoice number (from input): ${invoice}`);
    for (const [index, file] of group.files.entries()) {
      if (blocked) { report.push(`SKIPPED: ${file} (preceding step failed)`); continue; }
      const stepFolder = path.join(output, group.name, `${index + 1}-${file}`);
      const htmlFolder = path.join(stepFolder, "html-report");
      const jsonFile = path.join(stepFolder, "results.json");
      const logFile = path.join(stepFolder, "console.txt");
      const python = file === "create-invoice.py";
      const env = { ...baseEnv, RUN_TIMESTAMP: runId, PLAYWRIGHT_HTML_OPEN: "never", PLAYWRIGHT_HTML_OUTPUT_DIR: htmlFolder, PLAYWRIGHT_JSON_OUTPUT_FILE: jsonFile };
      if ((python || file === "validate-approve-invoice") && group.suffix) env.SUFFIX = group.suffix;
      const command = python ? "py" : process.execPath;
      const args = python ? ["tests/erp/ap/create-invoice.py"] : [path.join(root, "node_modules/@playwright/test/cli.js"), "test", `tests/erp/ap/${file}\\.spec\\.ts$`, "--headed", "--project=chromium", "--workers=1", "--retries=0", "--reporter=list,html,json", `--output=${path.join(stepFolder, "test-results")}`];
      console.log(`\n${group.name}: ${file}`);
      if (dryRun) { console.log(commands[index]); report.push(`PLANNED: ${file}`); continue; }
      fs.mkdirSync(stepFolder, { recursive: true });
      report.push(`RUNNING: ${file}`);
      save();
      let success = false;
      let text = "";
      try {
        const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["inherit", "pipe", "pipe"] });
        text = (result.stdout || "") + (result.stderr || "");
        if (result.error) text += `\n${result.error.message}`;
        process.stdout.write(text);
        fs.writeFileSync(logFile, text, "utf8");
        success = !result.error && result.status === 0;
        if (python) success = success && /^Created invoice .+$/m.test(text);
        else {
          const results = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
          success = success && results.stats.expected > 0 && results.stats.unexpected === 0 && results.stats.skipped === 0 && results.stats.flaky === 0 && !(results.errors?.length);
        }
      } catch (error) {
        text += `\n${String(error)}`;
        fs.writeFileSync(logFile, text, "utf8");
        success = false;
      }
      report.pop();
      let reportedInvoice = invoice;
      if (file === "create-manual-payment") {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dataFolder, "manual_payment.json"), "utf8"));
          reportedInvoice = data.invoices.map((entry: { invoiceNumber: string }) => prefix + entry.invoiceNumber).join(", ");
        } catch { reportedInvoice = "Unavailable (could not read manual_payment.json)"; }
      }
      report.push(`${success ? "PASSED" : "FAILED"}: ${file}`, `  Invoice number (input): ${reportedInvoice}`);
      const payment = text.match(/Created payment number:\s*(\S+)/)?.[1];
      report.push(`  Payment number: ${payment || "Not available from this procedure"}`);
      const receipts = [...new Set(Array.from(
        text.matchAll(/Captured receipt number:\s*(\d+)/g),
        (match) => match[1],
      ))];
      report.push(`  Receipt number: ${receipts.length ? receipts.join(", ") : "Not available from this procedure"}`);
      if (file === "pay-invoices") {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dataFolder, "pay-invoices.json"), "utf8"));
          paymentRequest = prefix + data.paymentName;
          report.push(`  Payment request name: ${paymentRequest}`);
        } catch { /* The test failure and console log retain input errors. */ }
      }
      report.push(`  Console: Get-Content ${quote(logFile)}`);
      if (!python && fs.existsSync(path.join(htmlFolder, "index.html"))) report.push(`  View report: npx playwright show-report ${quote(htmlFolder)}`);
      if (!success) { blocked = true; failed = true; }
      save();
    }
    if (blocked) {
      report.push(`View text report: Get-Content ${quote(reportPath)}`);
      report.push("", "Restart this subprocess (starts from creation; use a new PREFIX to avoid duplicate invoices):", ...setup,
        `$env:SUBPROCESS=${quote(group.name)}`, "node .\\tests\\erp\\ap\\ffi-ap-inv-call-script.ts",
        "", "Individual commands in order (use these to resume after already completed steps):", ...setup, suffixSetting, ...commands);
    }
    report.push("");
    save();
  }
  report.push(`Finished: ${new Date().toISOString()}`, dryRun ? "DRY RUN: no procedures executed." : failed ? "COMPLETED WITH FAILURES" : "ALL SELECTED PROCEDURES PASSED");
  save();
  console.log(dryRun ? "\nDry run complete; no commands executed." : `\nText report: ${reportPath}`);
  if (failed) process.exitCode = 1;
}

try { main(); } catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
