# DS Follow-Along

App web (PWA) para seguir las lecciones de Dollar Scholars en el navegador.
Privacidad primero: sin cuenta obligatoria, datos guardados en tu dispositivo.

Idiomas: español e inglés.

Licencia: todos los derechos reservados. Ver `LICENSE`.

## Agregar un idioma
1. Copia `i18n/es.json` a `i18n/<código>.json` y traduce los valores (no cambies las claves ni las `{variables}`).
2. Copia `content/es/` a `content/<código>/` y traduce los textos (no cambies ids, tipos ni montos).
3. Agrega `{"code": "<código>", "name": "<Nombre>"}` a `i18n/languages.json`.
4. Corre `python3 tools/check-i18n.py`. El workflow también lo corre y no publica si algo no coincide.

Si falta una clave o un archivo, la app usa el español.
