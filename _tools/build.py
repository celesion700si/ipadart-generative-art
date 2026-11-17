#!/usr/bin/env python3
"""Rebuild the lab home page, sitemap and per-page SEO blocks from works.json.

Run from the repository root:  python3 _tools/build.py
Edit works.json to add, reorder or reclassify a work, then run this script.
"""
import json, re, html, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "works.json").read_text(encoding="utf-8"))
SITE, WORKS, GROUPS = DATA["site"], DATA["works"], DATA["groups"]
BASE = SITE["url"]
E = html.escape

PERSON = {"@type": "Person", "@id": SITE["home"] + "#person", "name": SITE["author"]["name"],
          "alternateName": SITE["author"]["alternateName"], "url": SITE["author"]["url"]}


def work_ld(w):
    kind = "WebApplication" if w["type"] == "tool" else "VisualArtwork"
    ld = {"@context": "https://schema.org", "@type": kind, "name": w["title"],
          "alternateName": w["title_zh"], "url": f"{BASE}{w['id']}/",
          "description": w["desc_en"], "inLanguage": ["en", "zh-Hant"],
          "image": f"{BASE}og/{w['id']}.jpg", "dateCreated": str(w["year"]),
          "creator": PERSON, "isPartOf": {"@type": "WebSite", "name": SITE["name"], "url": BASE}}
    if kind == "WebApplication":
        ld.update({"applicationCategory": "DesignApplication", "operatingSystem": "Any (web browser)",
                   "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}})
    else:
        ld["artform"] = "Interactive generative art"
    return ld


def card(w):
    cls = f"work w-{w['id']}" + (" wide" if w.get("featured") or w.get("wide") else "")
    num = w["number"] + (" · FEATURED" if w.get("featured") else "")
    lesson = ""
    if w.get("lesson"):
        text = f"Used in · 用在：{E(w['lesson_en'])}｜{E(w['lesson'])}"
        lesson = f'<span class="lesson">{text}</span>'
    return (f'<a class="{cls}" href="./{w["id"]}/"><span class="number">{num}</span>'
            f'<div class="meta">{E(w["kind"])} · {w["year"]}</div>'
            f'<h2>{E(w["title"])} <span class="zh" lang="zh-Hant">{E(w["title_zh"])}</span></h2>'
            f'<p lang="en">{E(w["desc_en"])}</p><p class="zh" lang="zh-Hant">{E(w["desc_zh"])}</p>'
            f'{lesson}<span class="enter">{E(w["cta"])} →</span></a>')


def build_home():
    sections = []
    for g in GROUPS:
        items = [w for w in WORKS if w["type"] == g["id"]]
        cards = "\n".join(card(w) for w in items)
        sections.append(
            f'<section class="group" id="{g["id"]}s" aria-labelledby="h-{g["id"]}">\n'
            f'<div class="group-head"><h2 id="h-{g["id"]}">{g["label"]} <span lang="zh-Hant">{g["label_zh"]}</span></h2>'
            f'<p><span lang="en">{E(g["lead_en"])}</span> <span lang="zh-Hant">{E(g["lead_zh"])}</span></p></div>\n'
            f'<div class="grid">\n{cards}\n</div>\n</section>')
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": BASE + "#website", "name": SITE["name"], "url": BASE,
         "inLanguage": ["en", "zh-Hant"], "publisher": PERSON},
        {"@type": "CollectionPage", "@id": BASE + "#collection", "name": SITE["name"], "url": BASE,
         "isPartOf": {"@id": BASE + "#website"}, "about": PERSON,
         "mainEntity": {"@type": "ItemList", "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "name": w["title"], "url": f"{BASE}{w['id']}/"}
             for i, w in enumerate(WORKS)]}}]}
    tpl = (ROOT / "_tools" / "home.template.html").read_text(encoding="utf-8")
    out = tpl.replace("{{SECTIONS}}", "\n".join(sections)).replace(
        "{{JSONLD}}", json.dumps(ld, ensure_ascii=False))
    (ROOT / "index.html").write_text(out, encoding="utf-8")


SEO_RE = re.compile(r"\n?<!-- seo:start -->.*?<!-- seo:end -->\n?", re.S)


def inject(w):
    p = ROOT / w["id"] / "index.html"
    s = SEO_RE.sub("\n", p.read_text(encoding="utf-8"))
    url, img = f"{BASE}{w['id']}/", f"{BASE}og/{w['id']}.jpg"
    # Small previews are replaced by the large one below
    s = re.sub(r'[ \t]*<meta name="twitter:card" content="summary"\s*/?>\n?', "", s)
    add = []
    if 'rel="canonical"' not in s:
        add.append(f'<link rel="canonical" href="{url}">')
    for prop, val in (("og:type", "website"), ("og:site_name", SITE["name"]), ("og:url", url),
                      ("og:title", f"{w['title']}｜{w['title_zh']}"), ("og:description", w["desc_en"])):
        if f'property="{prop}"' not in s:
            add.append(f'<meta property="{prop}" content="{E(val)}">')
    add += [f'<meta property="og:image" content="{img}">',
            '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
            f'<meta property="og:image:alt" content="{E(w["title"])} — {E(w["title_zh"])}">',
            '<meta property="og:locale" content="zh_TW">', '<meta property="og:locale:alternate" content="en_US">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:image" content="{img}">']
    if 'name="author"' not in s:
        add.append(f'<meta name="author" content="{SITE["author"]["name"]}">')
    add.append('<script type="application/ld+json">' + json.dumps(work_ld(w), ensure_ascii=False) + "</script>")
    block = "<!-- seo:start -->\n" + "\n".join(add) + "\n<!-- seo:end -->\n"
    s = re.sub(r"</head>", lambda m: block + "</head>", s, count=1)
    p.write_text(s, encoding="utf-8")


def build_sitemap():
    today = datetime.date.today().isoformat()
    urls = [BASE] + [f"{BASE}{w['id']}/" for w in WORKS]
    body = "\n".join(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>" for u in urls)
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + body + "\n</urlset>\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n", encoding="utf-8")


if __name__ == "__main__":
    build_home()
    for w in WORKS:
        inject(w)
    build_sitemap()
    print(f"Built home page, {len(WORKS)} SEO blocks, sitemap.xml and robots.txt")
