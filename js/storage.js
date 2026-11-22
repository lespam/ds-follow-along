// Datos del usuario: solo en este dispositivo (localStorage). Versionados con migraciones.
export const DATA_VERSION = 1;
const KEY = "dsfa:data";

// migrations[n] convierte datos de la versión n a la n+1. Nunca borres datos al migrar.
const migrations = {
  // 1: (d) => { d.nuevoCampo = d.nuevoCampo ?? ""; return d; },
};

const blank = () => ({ v: DATA_VERSION, lang: null, last: null, answers: {}, done: {} });
let memoryOnly = false;
let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    let d = JSON.parse(raw);
    if (!d || typeof d !== "object") return blank();
    d.v = Number.isInteger(d.v) ? d.v : 1;
    // Datos de una versión más nueva que la app: no tocar, solo leer.
    while (d.v < DATA_VERSION) {
      const from = d.v;
      d = (migrations[from] || ((x) => x))(d);
      d.v = from + 1;
    }
    return { ...blank(), ...d };
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
export const askPersistent = () => navigator.storage?.persist?.().catch(() => {});
