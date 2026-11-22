// Datos del usuario: solo en este dispositivo (localStorage). Versionados con migraciones.
export const DATA_VERSION = 2;
const KEY = "dsfa:data";

// migrations[n] convierte datos de la versión n a la n+1. Nunca borres datos al migrar.
const migrations = {
  1: (d) => { d.budget = d.budget ?? { months: [] }; return d; }, // v2: presupuesto del Tema 1
};

const blank = () => ({ v: DATA_VERSION, lang: null, last: null, answers: {}, done: {}, budget: { months: [] } });
let memoryOnly = false;
let data = load();

// Lleva datos de cualquier versión anterior a la actual. Datos más nuevos que la app: no se tocan.
function migrate(d) {
  d.v = Number.isInteger(d.v) ? d.v : 1;
  while (d.v < DATA_VERSION) {
    const from = d.v;
    d = (migrations[from] || ((x) => x))(d);
    d.v = from + 1;
  }
  return { ...blank(), ...d };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const d = raw && JSON.parse(raw);
    return d && typeof d === "object" ? migrate(d) : blank();
  } catch { memoryOnly = true; return blank(); }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { memoryOnly = true; }
}

export const isMemoryOnly = () => memoryOnly;
export const getLang = () => data.lang;
export const setLang = (l) => { data.lang = l; persist(); };
export const getLast = () => data.last; // { topic, block }
export const setLast = (topic, block) => { data.last = { topic, block }; persist(); };
export const getAnswer = (topic, id) => data.answers[`${topic}.${id}`] ?? "";
export const setAnswer = (topic, id, value) => { data.answers[`${topic}.${id}`] = value; persist(); };
export const markDone = (topic, block) => { (data.done[topic] ||= {})[block] = true; persist(); };
export const isDone = (topic, block) => !!data.done[topic]?.[block];
export const getBudget = () => data.budget;
export const saveBudget = persist;
export const askPersistent = () => navigator.storage?.persist?.().catch(() => {});

// ---- Respaldo: exportar, importar, borrar ----
export const exportData = () => JSON.stringify({ app: "ds-follow-along", exportedAt: new Date().toISOString(), data }, null, 2);
export function importData(text) {
  try {
    const o = JSON.parse(text);
    const d = o && o.app === "ds-follow-along" ? o.data : null;
    if (!d || typeof d !== "object" || !Number.isInteger(d.v) || d.v > DATA_VERSION) return false; // v mayor: de una app más nueva
    if (typeof d.answers !== "object" || (d.budget && !Array.isArray(d.budget.months))) return false;
    data = migrate(d);
    persist();
    return true;
  } catch { return false; }
}
export const wipeData = () => { const lang = data.lang; data = blank(); data.lang = lang; persist(); };
