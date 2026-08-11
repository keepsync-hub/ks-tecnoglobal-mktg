# Pruebas

Smoke test end-to-end del portal en Chromium headless: sube un Excel, verifica
extracción y totales, genera la cotización y valida la descarga de PPTX y PDF.

```bash
npm i playwright-core     # una vez
node tests/smoke.cjs      # sale con código != 0 si algo falla
```

- Usa el Chromium de `PLAYWRIGHT_BROWSERS_PATH`. Si no, define la ruta al binario:
  `PW_EXECUTABLE=/ruta/a/chrome node tests/smoke.cjs`.
- Salida esperada: `OK  rows=4  total=$1.234.890  PPTX✓  PDF✓  sin errores`.
