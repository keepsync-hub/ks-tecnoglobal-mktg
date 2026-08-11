#!/usr/bin/env python3
"""
Build the TecnoGlobal quote portal from a single source fragment.

Outputs two artifacts from src/portal.template.html:

  1. index.html          -> full standalone page for GitHub Pages (the product).
                            Vendor libraries are referenced as separate files in
                            vendor/ (no CSP inlining), pdf.js worker wired up.
  2. dist/portal.artifact.html -> single self-contained fragment for publishing
                            as a Claude Artifact preview. All vendor JS is inlined
                            (strict CSP). pdf.js is omitted (PDF falls back to
                            manual entry in the preview).

Usage: python3 build.py
"""
import os, re, pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src" / "portal.template.html"
VENDOR = ROOT / "vendor"

# Vendor load order. (name, include_in_artifact)
PAGES_LIBS = [
    "xlsx.full.min.js",
    "fflate.min.js",
    "pptxgen.bundle.js",
    "jspdf.umd.min.js",
    "jspdf.plugin.autotable.min.js",
    "pdf.min.js",
]
ARTIFACT_LIBS = [
    "xlsx.full.min.js",
    "fflate.min.js",
    "pptxgen.bundle.js",
    "jspdf.umd.min.js",
    "jspdf.plugin.autotable.min.js",
    # pdf.js intentionally excluded from the inlined artifact preview
]


def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8")


def split_source():
    tpl = read(SRC)
    if "<!--__BODY__-->" not in tpl or "<!--__VENDOR__-->" not in tpl:
        raise SystemExit("Template missing __BODY__ / __VENDOR__ markers")
    head, body = tpl.split("<!--__BODY__-->", 1)
    return head.strip(), body


def build_pages():
    head, body = split_source()
    tags = ['<script src="vendor/%s"></script>' % n for n in PAGES_LIBS]
    tags.append('<script>window.__PDF_WORKER__="vendor/pdf.worker.min.js";</script>')
    body = body.replace("<!--__VENDOR__-->", "\n".join(tags))
    html = (
        "<!doctype html>\n<html lang=\"es\">\n<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
        "<meta name=\"description\" content=\"Portal de autoatención de TecnoGlobal: transforma listas de precios en cotizaciones con marca (PPTX + PDF).\">\n"
        + head + "\n</head>\n<body>\n" + body + "\n</body>\n</html>\n"
    )
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print("wrote index.html (%d KB)" % (len((html).encode()) // 1024))


def build_artifact():
    head, body = split_source()
    blocks = []
    for n in ARTIFACT_LIBS:
        js = read(VENDOR / n).replace("</script>", "<\\/script>")
        blocks.append("<script>\n%s\n</script>" % js)
    body = body.replace("<!--__VENDOR__-->", "\n".join(blocks))
    out = head + "\n" + body + "\n"
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    (dist / "portal.artifact.html").write_text(out, encoding="utf-8")
    print("wrote dist/portal.artifact.html (%d KB)" % (len(out.encode()) // 1024))


if __name__ == "__main__":
    build_pages()
    build_artifact()
    print("done.")
