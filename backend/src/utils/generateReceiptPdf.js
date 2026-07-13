import puppeteer from "puppeteer";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildReceiptHtml } from "./receiptTemplate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../");

const resolveExecutablePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  process.env.ELECTRON_EXECUTABLE_PATH ||
  process.env.ELECTRON_CHROMIUM_PATH ||
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    path.join(repoRoot, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"),
    path.join(repoRoot, "node_modules/electron/dist/electron")
  ].find((candidate) => existsSync(candidate)) ||
  null;

const launchBrowser = async () => {
  const executablePath = resolveExecutablePath();

  return puppeteer.launch({
    headless: "new",
    executablePath: executablePath || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
};

const generateReceiptPdf = async (receiptOptions = {}) => {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    const html = buildReceiptHtml(receiptOptions);

    await page.setContent(html, { waitUntil: "networkidle0" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
};

export default generateReceiptPdf;
