#!/usr/bin/env python3
"""Rakentaa staattisen sivuston design/-kansion .dc.html-näkymistä.

Käyttö:  python3 tools/build.py
Tulos:   index.html, segmentit.html, aikakone.html, kohdeyleiso.html
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT / "design"

PAGES = {
    "Main.dc.html": "index.html",
    "Segmentti.dc.html": "segmentit.html",
    "Aikakone.dc.html": "aikakone.html",
    "Kohdeyleiso.dc.html": "kohdeyleiso.html",
}


def convert(src: str) -> str:
    title = re.search(r"<title>(.*?)</title>", src, re.S).group(1)
    lang = re.search(r'<html lang="([^"]+)"', src).group(1)
    body = re.search(r"<x-dc>(.*)</x-dc>", src, re.S).group(1)
    helmet = re.search(r"<helmet>(.*?)</helmet>", body, re.S)
    head_extra = helmet.group(1).strip() if helmet else ""
    body = body.replace(helmet.group(0), "") if helmet else body

    m = re.search(r"<script type=\"text/x-dc\" data-dc-script data-props='([^']*)'>(.*?)</script>", src, re.S)
    props, logic = m.group(1), m.group(2)

    # sc-for / sc-if -> <template data-sc>, jotta selaimen jäsennin hyväksyy ne myös taulukoissa
    body = re.sub(r"<sc-(for|if)\b", r'<template data-sc="\1"', body)
    body = re.sub(r"</sc-(for|if)>", "</template>", body)

    out = f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{head_extra}
<script src="assets/runtime.js" defer></script>
</head>
<body>
<div id="dc-root"></div>
<template id="dc-tpl">{body}</template>
<script type="text/plain" id="dc-logic" data-props='{props}'>{logic}</script>
<noscript>Tämä sivu tarvitsee JavaScriptin.</noscript>
</body>
</html>
"""
    for dc, html in PAGES.items():
        out = out.replace(f'"{dc}"', f'"{html}"').replace(f"'{dc}'", f"'{html}'")
    return out


def main():
    for dc, html in PAGES.items():
        src = (DESIGN / dc).read_text(encoding="utf-8")
        (ROOT / html).write_text(convert(src), encoding="utf-8")
        print("rakennettu", html)


if __name__ == "__main__":
    main()
