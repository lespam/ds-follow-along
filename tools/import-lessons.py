"""Importa las lecciones públicas de dollarscholars.org a content/<idioma>/tema-NN.json.
Uso: python3 tools/import-lessons.py [--cache DIR]
- Lee solo páginas públicas (es-mx y en). Si --cache tiene el HTML (es-<slug>.html, en-<slug>.html,
  tes-<tema>.html, ten-<tema>.html) lo usa; si no, lo descarga.
- Tema 1 es manual (tema-01.json); aquí se le agrega la lección emergency-fund al final.
Los textos conservan **negritas** y [enlaces](url); el app los dibuja sin innerHTML."""
import json, os, re, sys, urllib.request
from html.parser import HTMLParser

TOPICS = ["money-foundations", "banking-basics", "paychecks-and-taxes", "credit-scores", "borrowing-wisely",
          "credit-cards-and-debt", "scams-and-identity", "renting", "buying-a-home", "financial-shocks"]
SITE = {"es": "https://dollarscholars.org/es-mx", "en": "https://dollarscholars.org"}
CACHE = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else None
VOID = {"br", "img", "input", "hr", "meta", "link", "path"}
SKIP = {"script", "style", "svg"}

class N:
    def __init__(s, tag, attrs, parent): s.tag, s.a, s.p, s.c = tag, dict(attrs), parent, []
    cls = property(lambda s: (s.a.get("class") or "").split())

class P(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.root = s.cur = N("root", [], None); s.skip = 0
    def handle_starttag(s, tag, attrs):
        if tag in SKIP: s.skip += 1; return
        if s.skip or tag in VOID:
            if not s.skip and tag == "br": s.cur.c.append(" ")
            return
        n = N(tag, attrs, s.cur); s.cur.c.append(n); s.cur = n
    def handle_endtag(s, tag):
        if tag in SKIP: s.skip = max(0, s.skip - 1); return
        if s.skip or tag in VOID: return
        n = s.cur
        while n and n.tag != tag: n = n.p
        if n and n.p: s.cur = n.p
    def handle_data(s, d):
        if not s.skip: s.cur.c.append(d)

def parse(html): p = P(); p.feed(html); return p.root
def find(n, f):
    for c in n.c:
        if isinstance(c, N):
            if f(c): yield c
            yield from find(c, f)
def first(n, f): return next(find(n, f), None)
def by_id(n, i): return first(n, lambda x: x.a.get("id") == i)
def by_cls(n, tag, cl): return first(n, lambda x: x.tag == tag and cl in x.cls)
def ws(s): return re.sub(r"\s+", " ", s).strip()

def inline(n):
    out = []
    for c in n.c:
        if isinstance(c, str): out.append(c); continue
        if "sr-only" in c.cls: continue
        t = inline(c)
        if c.tag in ("strong", "b"): t = f"**{ws(t)}**" if ws(t) else ""
        elif c.tag == "a" and c.a.get("href"):
            h = c.a["href"]
            if h.startswith("/"): h = "https://dollarscholars.org" + h
            t = f"[{ws(t)}]({h})"
        elif c.tag in ("ul", "ol", "p", "li", "div"): t = " " + t + " "
        out.append(t)
    return ws("".join(out))
text = lambda n: ws(inline(n)).replace("**", "")

def table(t):
    cap = first(t, lambda x: x.tag == "caption")
    head = [x for x in find(t, lambda x: x.tag == "thead")]
    hc = list(find(head[0], lambda x: x.tag == "th")) if head else []
    body = first(t, lambda x: x.tag == "tbody") or t
    rows, total = [], []
    for r in (x for x in find(body, lambda x: x.tag == "tr")):
        if "rs-total" in r.cls: total.append(len(rows))
        rows.append([inline(c) for c in r.c if isinstance(c, N) and c.tag in ("td", "th")])
    return {"table": {"caption": text(cap) if cap else "", "head": [inline(c) for c in hc],
            "num": [i for i, c in enumerate(hc) if "rs-num" in c.cls], "rows": rows, "total": total}}

def body_nodes(n):
    out = []
    for c in n.c:
        if not isinstance(c, N): continue
        if c.tag == "p": out.append({"formula": inline(c)} if "rs-formula" in c.cls else {"p": inline(c)})
        elif c.tag in ("ul", "ol"): out.append({c.tag: [inline(li) for li in c.c if isinstance(li, N)]})
        elif c.tag == "h3": out.append({"h3": inline(c)})
        elif c.tag == "table": out.append(table(c))
        elif c.tag == "blockquote": out.append({"quote": " ".join(inline(p) for p in c.c if isinstance(p, N))})
        elif c.tag == "dl": out.append({"dl": dl(c)})
        elif c.tag == "div": out += body_nodes(c)
        elif c.tag in ("section", "span"): out += body_nodes(c)
    return out

def dl(n):
    pairs, term = [], None
    for c in n.c:
        if isinstance(c, N) and c.tag == "dt": term = inline(c)
        elif isinstance(c, N) and c.tag == "dd": pairs.append([term, inline(c)])
    return pairs

def get(kind, name, lang):
    pre = {"lesson": "", "topic": "t"}[kind]
    f = f"{pre}{lang}-{name}.html" if kind == "lesson" else f"t{lang}-{name}.html"
    if CACHE and os.path.exists(os.path.join(CACHE, f)): return open(os.path.join(CACHE, f), encoding="utf-8").read()
    base = SITE[lang] + ("/resources/lessons/" if kind == "lesson" else "/resources/topics/")
    return urllib.request.urlopen(base + name + "/", timeout=30).read().decode("utf-8")

def dedupe(s):
    h = len(s) // 2
    return s[:h] if len(s) % 2 == 0 and s[:h] == s[h:] else s

def lesson(slug, lang):
    root = parse(get("lesson", slug, lang))
    art = first(root, lambda x: x.tag == "article")
    h1 = text(first(art, lambda x: x.tag == "h1"))
    lede = by_cls(art, "p", "hero-lede")
    spans = [x for x in lede.c if isinstance(x, N) and x.tag == "span"]
    summary, meta = dedupe(text(spans[0])), text(spans[1]) if len(spans) > 1 else ""
    num = int(re.search(r"(\d+)\s+\S+\s+(\d+)", text(first(art, lambda x: "eyebrow" in x.cls))).group(1))
    L = {"slug": slug, "title": h1, "summary": summary, "meta": meta, "n": num}
    blocks = []
    def add(kind, i, title, body, label=None):
        b = {"id": f"{slug}-{i}", "type": "lesson", "lesson": slug, "lessonTitle": h1, "kind": kind, "title": title, "body": body}
        if label: b["label"] = label
        blocks.append(b)
    obj = by_id(art, "objectives")
    ob = [{"ul": [inline(li) for li in find(obj, lambda x: x.tag == "li") if li.p.tag == "ul" and "rs-connection" not in li.cls]}]
    conn = by_cls(obj, "p", "rs-connection")
    add("intro", "intro", h1, [{"p": summary}, {"p": meta}, {"h3": text(first(obj, lambda x: x.tag == "h2"))}] + ob + ([{"p": inline(conn)}] if conn else []))
    w = by_id(art, "words")
    add("words", "words", text(first(w, lambda x: x.tag == "h2")), [{"dl": dl(first(w, lambda x: x.tag == "dl"))}])
    for i, s in enumerate(x for x in find(art, lambda x: x.tag == "section" and re.fullmatch(r"section-\d+", x.a.get("id", "")))):
        k = [c for c in s.cls if c.startswith("rs-section--")][0].split("--")[1]
        lab = by_cls(s, "p", "rs-callout-label")
        add(k, f"s{i + 1}", text(first(s, lambda x: x.tag == "h2")), body_nodes(by_cls(s, "div", "rs-body")), text(lab) if lab else None)
    tk = by_id(art, "takeaways")
    add("takeaways", "takeaways", text(first(tk, lambda x: x.tag == "h2")), [{"ul": [inline(li) for li in find(tk, lambda x: x.tag == "li")]}])
    q = by_id(art, "quiz")
    add("quiz", "quiz", text(first(q, lambda x: x.tag == "h2")), [{"quiz": f"{SITE[lang]}/resources/lessons/{slug}/#quiz"}])
    gf = by_id(art, "go-further")
    links = []
    for li in find(gf, lambda x: x.tag == "li"):
        a = first(li, lambda x: x.tag == "a")
        meta = by_cls(li, "p", "rs-link-meta"); d = by_cls(li, "p", "rs-link-description")
        links.append({"t": text(first(a, lambda x: x.tag == "span")), "u": a.a["href"], "org": text(first(meta, lambda x: x.tag == "bdi")) if meta else "", "d": text(d) if d else ""})
    add("links", "links", text(first(gf, lambda x: x.tag == "h2")), [{"p": text(first(gf, lambda x: x.tag == "p"))}, {"links": links}])
    return L, blocks

def topic_info(slug, lang):
    root = parse(get("topic", slug, lang))
    h1 = text(first(root, lambda x: x.tag == "h1"))
    lede = by_cls(root, "p", "hero-lede")
    spans = [x for x in lede.c if isinstance(x, N) and x.tag == "span"]
    seen = []
    for a in find(root, lambda x: x.tag == "a" and re.search(r"/resources/lessons/[^/]+/$", x.a.get("href", ""))):
        s = a.a["href"].rstrip("/").split("/")[-1]
        if s not in seen: seen.append(s)
    return h1, dedupe(text(spans[0])), seen

def main():
    for lang in ("es", "en"):
        index = []
        for ti, slug in enumerate(TOPICS, 1):
            tid = f"tema-{ti:02d}"
            title, summary, slugs = topic_info(slug, lang)
            ls, blocks = [], []
            for s in slugs:
                if tid == "tema-01" and s == "spending-plan": continue  # Tema 1 se escribió a mano
                L, b = lesson(s, lang); ls.append(L); blocks += [(L["n"], x) for x in b]
            blocks = [b for _, b in sorted(blocks, key=lambda x: x[0])]
            label = ("Tema" if lang == "es" else "Topic") + f" {ti}: {title}"
            if tid == "tema-01":
                p = f"content/{lang}/{tid}.json"; d = json.load(open(p, encoding="utf-8"))
                d["blocks"] = [b for b in d["blocks"] if b.get("type") != "lesson"] + blocks
                d["lessons"] = ls
            else:
                d = {"id": tid, "title": label, "summary": summary, "imported": True, "lessons": ls, "blocks": blocks}
            json.dump(d, open(f"content/{lang}/{tid}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            index.append({"id": tid, "title": d["title"] if tid != "tema-01" else d["title"], "summary": summary, "lessons": [s for s in slugs]})
            print(lang, tid, len(blocks), "bloques", [L["slug"] for L in ls])
        json.dump({"topics": index}, open(f"content/{lang}/index.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
main()
