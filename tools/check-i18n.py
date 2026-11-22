"""Revisa que cada idioma de i18n/languages.json tenga las mismas claves y la misma estructura que el base (es).
Uso: python3 tools/check-i18n.py   (falla con código 1 si algo no coincide)"""
import json, os, sys
BASE = "es"
langs = [l["code"] for l in json.load(open("i18n/languages.json", encoding="utf-8"))]
err = []

def load(p):
    return json.load(open(p, encoding="utf-8"))

def shape(x):
    """Estructura sin textos: claves, tamaños de listas y tipos de bloque."""
    if isinstance(x, dict): return {k: shape(v) for k, v in x.items() if k not in ("title", "caption")}
    if isinstance(x, list): return [shape(v) if isinstance(v, (dict, list)) else "·" for v in x]
    return "·" if isinstance(x, str) else x  # los números (montos) deben coincidir

def numbers(x):
    if isinstance(x, dict): return [n for v in x.values() for n in numbers(v)]
    if isinstance(x, list): return [n for v in x for n in numbers(v)]
    return [x] if isinstance(x, (int, float)) else []

ui = load(f"i18n/{BASE}.json")
topics = sorted(f for f in os.listdir(f"content/{BASE}"))
for l in langs:
    if l == BASE: continue
    d = load(f"i18n/{l}.json")
    for k in ui.keys() - d.keys(): err.append(f"i18n/{l}.json: falta la clave {k}")
    for k in d.keys() - ui.keys(): err.append(f"i18n/{l}.json: clave de más {k}")
    import re
    for k in ui.keys() & d.keys():
        if sorted(re.findall(r"\{\w+\}", ui[k])) != sorted(re.findall(r"\{\w+\}", d[k])):
            err.append(f"i18n/{l}.json: variables distintas en {k}")
    for f in topics:
        p = f"content/{l}/{f}"
        if not os.path.exists(p): err.append(f"falta {p}"); continue
        a, b = load(f"content/{BASE}/{f}"), load(p)
        if shape(a) != shape(b): err.append(f"{p}: la estructura no coincide con {BASE}")
        if numbers(a) != numbers(b): err.append(f"{p}: los montos no coinciden con {BASE}")
print("\n".join(err) or f"i18n ok ({', '.join(langs)})")
sys.exit(1 if err else 0)
