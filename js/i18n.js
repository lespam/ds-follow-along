// Textos de la interfaz en i18n/<lang>.json; lecciones en content/<lang>/<tema>.json.
// Idiomas disponibles: i18n/languages.json. Si falta una clave o un archivo, se usa el idioma base (es).
const BASE = "es";
let languages = [{ code: BASE, name: "Español" }];
let dict = {};
let baseDict = {};
let lang = BASE;

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  return r.json();
};

export async function initLanguages() {
  try { languages = await fetchJSON("i18n/languages.json"); } catch { /* se queda con el base */ }
  return languages;
}
export const getLanguages = () => languages;

export function detectLang(saved) {
  const codes = languages.map((l) => l.code);
  if (codes.includes(saved)) return saved;
  for (const n of navigator.languages || [navigator.language]) {
    const c = (n || "").toLowerCase().split("-")[0];
    if (codes.includes(c)) return c;
  }
  return BASE;
}

export async function setLanguage(l) {
  lang = l;
  baseDict = await fetchJSON(`i18n/${BASE}.json`);
  dict = l === BASE ? baseDict : await fetchJSON(`i18n/${l}.json`).catch(() => ({}));
  document.documentElement.lang = l;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
}
export const getLanguage = () => lang;
export const t = (key, vars = {}) =>
  (dict[key] ?? baseDict[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

const loadContent = (name) => fetchJSON(`content/${lang}/${name}.json`).catch(() => fetchJSON(`content/${BASE}/${name}.json`));
export const loadTopic = loadContent;
export const loadIndex = () => loadContent("index");
