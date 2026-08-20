/**
 * Smoke test end-to-end del portal (headless Chromium).
 *
 * Levanta un servidor estático sobre el repo, abre index.html, sube un Excel de
 * ejemplo, verifica la extracción y los totales, genera la cotización y valida que
 * el PPTX (ZIP) y el PDF (%PDF) se descarguen correctamente.
 *
 * Requisitos:
 *   npm i playwright-core
 *   (usa el Chromium de PLAYWRIGHT_BROWSERS_PATH; o define PW_EXECUTABLE con la ruta
 *    a un binario de Chromium/Chrome)
 *
 * Uso:  node tests/smoke.cjs        (sale con código != 0 si algo falla)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const REPO = path.resolve(__dirname, "..");
const XLSX = require(path.join(REPO, "vendor", "xlsx.full.min.js"));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".css": "text/css" };

function sampleXlsx() {
  const aoa = [
    ["Código", "Descripción", "Cantidad", "Precio Unitario"],
    ["HP-M404DN", "Impresora HP LaserJet Pro M404dn", 2, "$ 289.990"],
    ["LOG-MK540", "Kit teclado y mouse Logitech MK540", 5, "$ 34.990"],
    ["DELL-P2422H", 'Monitor Dell 24" P2422H Full HD', 3, "129990"],
    ["APC-BX950", "UPS APC Back-UPS 950VA", 1, "89.990"],
    ["", "TOTAL GENERAL", "", "$ 1.234.890"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Precios");
  const p = path.join(require("os").tmpdir(), "tg-smoke-sample.xlsx");
  fs.writeFileSync(p, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  return p;
}

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, r) => {
      let u = req.url === "/" ? "/index.html" : req.url.split("?")[0];
      const fp = path.join(REPO, decodeURIComponent(u));
      if (!fp.startsWith(REPO) || !fs.existsSync(fp)) { r.statusCode = 404; return r.end("nf"); }
      r.setHeader("Content-Type", MIME[path.extname(fp)] || "application/octet-stream");
      fs.createReadStream(fp).pipe(r);
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

function assert(cond, msg) { if (!cond) throw new Error("ASSERT: " + msg); }

(async () => {
  const sample = sampleXlsx();
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const launch = { headless: true, args: ["--no-sandbox"] };
  if (process.env.PW_EXECUTABLE) launch.executablePath = process.env.PW_EXECUTABLE;
  const browser = await chromium.launch(launch);
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message)));
  try {
    await page.goto(base + "/index.html", { waitUntil: "networkidle" });
    await page.fill("#g-name", "Test QA");
    await page.fill("#g-email", "test.qa@tecnoglobal.cl");
    await page.fill("#g-phone", "+56 9 1234 5678");
    await page.click("#g-enter");
    await page.waitForSelector("#screen-upload.active", { timeout: 5000 });

    await page.setInputFiles("#fileInput", sample);
    await page.waitForSelector("#screen-review.active", { timeout: 5000 });
    const rows = await page.$$eval("#priceBody tr", (t) => t.length);
    const grand = (await page.textContent("#t-grand")).replace(/\s/g, "");
    assert(rows === 4, "esperaba 4 filas, obtuve " + rows);
    assert(grand.includes("1.234.890"), "total inesperado: " + grand);

    // Los datos del ejecutivo (correo/teléfono) se propagan al panel de la cotización.
    const sEmail = await page.inputValue("#m-seller-email");
    const sPhone = await page.inputValue("#m-seller-phone");
    assert(sEmail === "test.qa@tecnoglobal.cl", "correo vendedor no propagado: " + sEmail);
    assert(sPhone === "+56 9 1234 5678", "teléfono vendedor no propagado: " + sPhone);

    // Los términos y condiciones vienen prefijados (texto de ejemplo editable) con las cláusulas clave.
    const terms = await page.inputValue("#m-terms");
    assert(terms && terms.trim().length > 0, "términos y condiciones no prefijados");
    assert(terms.includes("Precios y disponibilidad") && terms.includes("Garantía"),
      "faltan cláusulas clave en los términos y condiciones");

    // Modo "alternativas": oculta el total general del panel. Luego se vuelve a "suma".
    await page.selectOption("#m-mode", "alt");
    const grandHidden = await page.$eval("#t-grand-row", (el) => el.hidden);
    assert(grandHidden === true, "en modo alternativas el total general debe ocultarse");
    await page.selectOption("#m-mode", "sum");
    const grandShown = await page.$eval("#t-grand-row", (el) => el.hidden);
    assert(grandShown === false, "en modo suma el total general debe mostrarse");

    await page.click("#genBtn");
    await page.waitForSelector("#screen-done.active", { timeout: 10000 });

    // La vista previa del PDF se muestra con un blob URL en el iframe.
    await page.waitForSelector("#previewPane:not([hidden])", { timeout: 5000 });
    const previewSrc = await page.getAttribute("#pdfPreview", "src");
    assert(previewSrc && previewSrc.startsWith("blob:"), "vista previa sin blob URL: " + previewSrc);

    const outDir = require("os").tmpdir();
    const [dp] = await Promise.all([page.waitForEvent("download"), page.click("#dlPptx")]);
    const pptx = path.join(outDir, "tg-smoke.pptx"); await dp.saveAs(pptx);
    assert(fs.readFileSync(pptx).slice(0, 2).toString() === "PK", "PPTX no es un ZIP válido");

    const [dd] = await Promise.all([page.waitForEvent("download"), page.click("#dlPdf")]);
    const pdf = path.join(outDir, "tg-smoke.pdf"); await dd.saveAs(pdf);
    assert(fs.readFileSync(pdf).slice(0, 5).toString() === "%PDF-", "PDF inválido");

    assert(errors.length === 0, "errores de página: " + errors.join(" | "));
    console.log("OK  rows=4  total=$1.234.890  vendedor✓  modo-alt✓  terms✓  preview✓  PPTX✓  PDF✓  sin errores");
    await browser.close(); srv.close(); process.exit(0);
  } catch (e) {
    console.error("FALLO:", e.message, errors.length ? "| " + errors.join(" | ") : "");
    await browser.close(); srv.close(); process.exit(1);
  }
})();
