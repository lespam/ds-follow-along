// Textos de la interfaz en i18n/<lang>.json; lecciones en content/<lang>/<tema>.json
export const LANGS = ["es", "en"];
let dict = {};
let lang = "es";

export const detectLang = (saved) =>
  LANGS.includes(saved) ? saved : (navigator.language || "es").toLowerCase().startsWith("en") ? "en" : "es";

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  return r.json();
};

export async function setLanguage(l) {
  lang = l;
  dict = await fetchJSON(`i18n/${l}.json`);
  document.documentElement.lang = l;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
}
export const getLanguage = () => lang;
export const t = (key, vars = {}) =>
  (dict[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
export const loadTopic = (id) => fetchJSON(`content/${lang}/${id}.json`);
export const loadIndex = () => fetchJSON(`content/${lang}/index.json`);
