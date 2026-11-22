"""Estampa la versión de compilación en sw.js y version.json. Lo ejecuta GitHub Actions."""
import json, os, sys
build = sys.argv[1]
skip = {"sw.js", "version.json", "CLAUDE.md", "README.md", "LICENSE"}
files = []
for root, dirs, names in os.walk("."):
    dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("tools", "node_modules")]
    for n in names:
        p = os.path.relpath(os.path.join(root, n), ".").replace(os.sep, "/")
        if p not in skip: files.append(p)
files.sort()
s = open("sw.js", encoding="utf-8").read()
s = s.replace('"__BUILD__"', json.dumps(build)).replace('["__FILES__"]', json.dumps(files))
open("sw.js", "w", encoding="utf-8").write(s)
v = json.load(open("version.json")); v["build"] = build
json.dump(v, open("version.json", "w"))
print(f"build={build} files={len(files)}")
