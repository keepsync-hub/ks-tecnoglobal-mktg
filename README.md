# Portal de Cotizaciones — TecnoGlobal

Portal de **autoatención** para el equipo de ventas de TecnoGlobal. Recibe una lista
de precios en Excel / Word / PowerPoint / PDF y la transforma en una **cotización con
la marca de TecnoGlobal**, lista para descargar en dos formatos:

- **PowerPoint (`.pptx`)** — editable, para ajustar textos antes de enviar.
- **PDF** — listo para adjuntar a un correo al cliente.

Todo ocurre **en el navegador**: los archivos y precios no se envían a ningún servidor.

## Cómo se usa

1. **Identifícate** con tu nombre (queda como responsable de la cotización).
2. **Sube** el archivo con la tabla de precios (o empieza con una tabla en blanco).
3. **Revisa y edita** la tabla y los datos (cliente, fecha, moneda, validez, notas).
4. **Genera** y descarga el PPTX y/o el PDF.

Formatos de entrada soportados:

| Formato | Estado |
|---|---|
| Excel `.xlsx` / `.csv` | ✅ Recomendado (extracción más confiable) |
| Word `.docx` | ✅ Tablas |
| PowerPoint `.pptx` | ✅ Tablas |
| PDF | 🧪 Beta (extracción aproximada; revisa/corrige a mano) |

La extracción es una **conveniencia**: si algo no se reconoce bien, la grilla siempre
es editable, así que nunca quedas bloqueado.

## Publicar en GitHub Pages

El sitio es estático (`index.html` + `vendor/` + `assets/`), así que se publica tal cual:

1. En GitHub: **Settings → Pages**.
2. **Source:** *Deploy from a branch*.
3. **Branch:** la rama con este código, carpeta **`/ (root)`**. Guardar.
4. A los minutos queda disponible en `https://<org>.github.io/<repo>/`.

> Recomendado: fusionar a la rama por defecto (`main`) y publicar Pages desde ahí.

## Reemplazar el logo por el oficial

El header y las cotizaciones usan `assets/logo_tecnoglobal.png` (con respaldo en
`assets/logo_tecnoglobal.svg`). Para usar el logo oficial de TecnoGlobal, **reemplaza
ese archivo** `assets/logo_tecnoglobal.png` por el oficial (mismo nombre, fondo
transparente recomendado). No hay que tocar código.

## Estructura

```
index.html                     Sitio para GitHub Pages (generado por build.py)
src/portal.template.html       Fuente única (edita aquí)
build.py                       Genera index.html y el preview de artefacto
vendor/                        Librerías (SheetJS, PptxGenJS, jsPDF, fflate, pdf.js)
assets/                        Logo (png + svg)
dist/portal.artifact.html      Preview autocontenido (Claude Artifact) — no se versiona
```

Al editar `src/portal.template.html`, regenera con:

```bash
python3 build.py
```

## Limitaciones del MVP (y cómo se resuelven a futuro)

Este MVP es 100% cliente (sin servidor), lo que trae dos límites conocidos:

- **El PDF no es un render idéntico del PPTX.** Se genera por separado con el mismo
  modelo de datos y marca (queda consistente, no pixel-perfect).
- **La extracción de tablas desde PDF es aproximada** (PDFs digitales; los escaneados
  no se soportan).
- **El "acceso" es identificación suave**, no autenticación real.

Cuando estos puntos sean bloqueantes, la ruta de evolución es un **backend Python
(FastAPI)** con `python-pptx` + `pdfplumber` y **LibreOffice** (`soffice --convert-to
pdf`) para un PDF idéntico al PPTX y extracción robusta, más SSO real (p. ej. Cloudflare
Access). El frontend y el modelo de datos actuales se reutilizan.

## Desarrollo local

```bash
python3 build.py                 # genera index.html
python3 -m http.server 8000      # sirve el repo
# abrir http://localhost:8000
```

Sírvelo por HTTP (no `file://`) para que el logo y las librerías carguen correctamente.
